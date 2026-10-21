import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, PixelRatio, Platform } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import BgBtn from "../../components/ui/buttons/BgBtn";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ElevationProfile from "../../components/routes/ElevationProfile";
import { useRouteDetail } from "../../hooks/routes/useRouteDetail";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import type { Coordinates } from "../../lib/metrics/geo";
import type { RouteDetail } from "../../lib/routes/api";
import { DETAIL_MESSAGES, DIFFICULTY_LABELS, formatDistanceFromUser } from "../../lib/routes/format";
import { distanceFromUser, pathToCoordinates, regionForPath } from "../../lib/routes/geo";
import { mensajeDeFallo, type RouteActionFailure } from "../../lib/routes/status";
import { colors } from "../../lib/theme/colors";

type Props = StaticScreenProps<{ id: string }>;

// Una posición reciente basta para la distancia hasta el inicio (como en "Explorar rutas").
const MAX_EDAD_POSICION_MS = 5 * 60_000;

// Ubicación del usuario solo si ya dio permiso: el detalle no lo pide (CA-10, constitución 3.5).
function useUbicacionSiHayPermiso(): Coordinates | null {
    const [user, setUser] = useState<Coordinates | null>(null);
    useEffect(() => {
        let vigente = true;
        (async () => {
            const { granted } = await Location.getForegroundPermissionsAsync();
            if (!granted) return;
            const reciente = await Location.getLastKnownPositionAsync({ maxAge: MAX_EDAD_POSICION_MS });
            const { coords } =
                reciente ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
            if (vigente) setUser({ latitude: coords.latitude, longitude: coords.longitude });
        })().catch((e) => console.log('Error obteniendo la ubicación para el detalle:', e));
        return () => {
            vigente = false;
        };
    }, []);
    return user;
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <View style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// Recorrido completo con su inicio y su final. Los elementos son fijos mientras se muestra la
// ruta (no se insertan en medio), así que no tiene el problema de Android de la spec 006 (M2).
// Margen alrededor del recorrido, en puntos de pantalla. En Android react-native-maps lo recibe
// en píxeles físicos; en iOS, en puntos.
const MARGEN_MAPA_PT = 32;
const margenMapa = Platform.OS === 'android' ? PixelRatio.getPixelSizeForLayoutSize(MARGEN_MAPA_PT) : MARGEN_MAPA_PT;

function RouteMap({ route }: { route: RouteDetail }) {
    const mapRef = useRef<MapView>(null);
    const coordenadas = useMemo(() => pathToCoordinates(route.path), [route.path]);
    const final = coordenadas[coordenadas.length - 1];

    // initialRegion solo da el primer cuadro: en Android no respeta su margen y el extremo de un
    // recorrido largo quedaba en el borde (M4). Con el mapa listo se encuadra el recorrido completo
    // con un margen fijo en pantalla.
    const encuadrar = () => {
        if (coordenadas.length < 2) return;
        mapRef.current?.fitToCoordinates(coordenadas, {
            edgePadding: { top: margenMapa, right: margenMapa, bottom: margenMapa, left: margenMapa },
            animated: false,
        });
    };

    return (
        <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={regionForPath(route.path, route.start)}
            onMapReady={encuadrar}
            toolbarEnabled={false}
            showsMyLocationButton={false}
        >
            {coordenadas.length >= 2 && (
                <Polyline coordinates={coordenadas} strokeColor={colors.data} strokeWidth={5} zIndex={1} />
            )}
            <Marker coordinate={route.start} anchor={{ x: 0.5, y: 0.5 }} zIndex={3} tracksViewChanges={false} title="Inicio">
                <View style={styles.startDot} />
            </Marker>
            {final && coordenadas.length >= 2 && (
                <Marker coordinate={final} anchor={{ x: 0.5, y: 0.5 }} zIndex={2} tracksViewChanges={false} title="Final">
                    <View style={styles.endDot} />
                </Marker>
            )}
        </MapView>
    );
}

// Guardar o quitar de favoritas (CA-15). El botón cambia cuando el detalle se refresca con el
// estado del servidor.
function FavoriteButton({ route }: { route: RouteDetail }) {
    const { favorite } = useRouteMutations();
    const texto = favorite.isPending
        ? route.isFavorite
            ? 'Quitando...'
            : 'Guardando...'
        : route.isFavorite
          ? 'Quitar de favoritas'
          : 'Guardar en favoritas';
    const Boton = route.isFavorite ? BgBtn : PrimaryButton;
    return (
        <View style={styles.favorite}>
            <Boton
                text={texto}
                style={styles.button}
                onPress={() => {
                    if (!favorite.isPending) favorite.mutate({ id: route.id, save: !route.isFavorite });
                }}
            />
            {favorite.isError && <Text style={styles.error}>{mensajeDeFallo(favorite.error)}</Text>}
        </View>
    );
}

// Acciones de quien publicó la ruta (CA-12, CA-22 a CA-25). El servidor rechaza cualquiera de
// ellas si la ruta no es del usuario (CA-26). Borrar pide confirmación; la página hace el borrado
// para seguir montada mientras dura (ver RouteDetailPage).
function OwnerActions({
    route,
    onDelete,
    deleteError,
    clearDeleteError,
}: {
    route: RouteDetail;
    onDelete: () => void;
    deleteError: RouteActionFailure | null;
    clearDeleteError: () => void;
}) {
    const navigation = useNavigation();
    const { update } = useRouteMutations();
    const ocupado = update.isPending;
    const archivada = route.status === 'ARCHIVED';
    const fallo = update.error ?? deleteError;

    // Archivar la quita de "Explorar rutas" para todos (CA-23); volver a publicar la regresa con
    // los mismos datos (CA-24).
    const cambiarEstado = () => {
        if (ocupado) return;
        clearDeleteError();
        update.mutate({ id: route.id, changes: { status: archivada ? 'PUBLISHED' : 'ARCHIVED' } });
    };

    const borrar = () => {
        if (ocupado) return;
        Alert.alert(
            '¿Borrar esta ruta?',
            'Desaparece del catálogo y de "Mis rutas". La actividad de la que salió sigue en tu historial y la puedes volver a publicar.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Borrar',
                    style: 'destructive',
                    onPress: () => {
                        update.reset();
                        onDelete();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.owner}>
            <Text style={styles.sectionTitle}>Tu ruta</Text>
            <BgBtn
                text="Editar"
                style={styles.button}
                onPress={() => {
                    if (!ocupado) navigation.navigate('EditRoute', { id: route.id });
                }}
            />
            <BgBtn
                text={update.isPending ? 'Guardando...' : archivada ? 'Volver a publicar' : 'Archivar'}
                style={styles.button}
                onPress={cambiarEstado}
            />
            <BgBtn
                text="Borrar"
                style={[styles.button, styles.deleteButton]}
                textStyle={styles.deleteText}
                onPress={borrar}
            />
            {!!fallo && <Text style={styles.error}>{mensajeDeFallo(fallo)}</Text>}
        </View>
    );
}

// Detalle de una ruta (spec 007, CA-10 a CA-15). El recorrido completo y el perfil se descargan
// solo aquí (requisito de datos móviles).
export default function RouteDetailPage({ route: navRoute }: Props) {
    const { id } = navRoute.params;
    const navigation = useNavigation();
    const { route, status, retry } = useRouteDetail(id);
    const user = useUbicacionSiHayPermiso();
    const { remove } = useRouteMutations();

    // Borrar (CA-25). Al terminar, ['routes'] se invalida y este detalle se recarga con 404 antes
    // de que corra onSuccess; mientras se borra y después, se muestra la espera en lugar de "ya no
    // está disponible". El mutate es de la página porque OwnerActions se desmonta en ese momento
    // y sus callbacks ya no correrían.
    const borrar = (id: string) =>
        remove.mutate(id, {
            onSuccess: () => {
                Alert.alert('Ruta borrada', 'Ya no aparece en el catálogo ni en "Mis rutas".', [
                    { text: 'Aceptar', onPress: () => navigation.goBack() },
                ]);
            },
        });

    if (status === 'loading' || remove.isPending || remove.isSuccess) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (status !== 'success' || !route) {
        const mensaje =
            status === 'offline'
                ? DETAIL_MESSAGES.offline
                : status === 'unavailable'
                  ? DETAIL_MESSAGES.unavailable
                  : DETAIL_MESSAGES.error;
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.notice}>{mensaje}</Text>
                {status === 'unavailable' ? (
                    <PrimaryButton text="Volver" style={styles.button} onPress={() => navigation.goBack()} />
                ) : (
                    <PrimaryButton text="Reintentar" style={styles.button} onPress={retry} />
                )}
            </View>
        );
    }

    const subtitulo = [
        ACTIVITY_TYPE_LABELS[route.type],
        route.region,
        route.difficulty ? DIFFICULTY_LABELS[route.difficulty] : null,
    ]
        .filter(Boolean)
        .join(' · ');
    const distanciaATi = formatDistanceFromUser(distanceFromUser(route, user));

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <RouteMap route={route} />

            <View style={styles.body}>
                <View style={styles.header}>
                    <Text style={styles.title}>{route.name}</Text>
                    {route.isMine && (
                        <View style={styles.mineBadge}>
                            <Text style={styles.mineBadgeText}>Tuya</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.subtitle}>{subtitulo}</Text>
                {route.status === 'ARCHIVED' && (
                    <Text style={styles.archived}>Archivada: no aparece en "Explorar rutas".</Text>
                )}

                <View style={styles.stats}>
                    <Stat value={formatDistance(route.distanceMeters)} label="Distancia" />
                    <Stat value={formatElevation(route.elevationGainMeters)} label="Elevación ganada" />
                </View>

                {/* Las de ejemplo tienen como autor "SendaBC" (spec 006, CA-19) */}
                <Text style={styles.detail}>Por {route.author}</Text>
                {distanciaATi && <Text style={styles.detail}>{distanciaATi}</Text>}
                {!!route.description && <Text style={styles.description}>{route.description}</Text>}

                <Text style={styles.sectionTitle}>Perfil de elevación</Text>
                <ElevationProfile perfil={route.elevationProfile} />

                <FavoriteButton route={route} />

                {route.isMine && (
                    <OwnerActions
                        route={route}
                        onDelete={() => borrar(route.id)}
                        deleteError={remove.error}
                        clearDeleteError={remove.reset}
                    />
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
    },
    content: {
        paddingBottom: 32,
    },
    map: {
        height: 280,
        alignSelf: 'stretch',
    },
    startDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        borderWidth: 3,
        borderColor: colors.background,
    },
    endDot: {
        width: 16,
        height: 16,
        borderRadius: 3,
        backgroundColor: colors.secondary,
        borderWidth: 3,
        borderColor: colors.background,
    },
    body: {
        padding: 20,
        gap: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    title: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    mineBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: colors.secondary,
        marginTop: 6,
    },
    mineBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.background,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textMuted,
    },
    archived: {
        fontSize: 14,
        color: colors.secondary,
        fontWeight: '600',
    },
    stats: {
        flexDirection: 'row',
        marginVertical: 6,
    },
    stat: {
        flex: 1,
        gap: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 13,
        color: colors.textMuted,
    },
    detail: {
        fontSize: 14,
        color: colors.textMuted,
    },
    description: {
        fontSize: 15,
        color: colors.text,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 12,
    },
    favorite: {
        marginTop: 16,
        gap: 6,
    },
    owner: {
        marginTop: 8,
        gap: 10,
    },
    deleteButton: {
        borderColor: colors.error,
    },
    deleteText: {
        color: colors.error,
    },
    button: {
        paddingVertical: 14,
    },
    notice: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    },
    error: {
        color: colors.error,
        fontSize: 14,
        textAlign: 'center',
    },
});
