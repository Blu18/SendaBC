import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, PixelRatio, Platform } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import BgBtn from "../../components/ui/buttons/BgBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import Metric from "../../components/ui/Metric";
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
import { fontFamilies, lightColors, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

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

// Recorrido completo con su inicio y su final. Los elementos son fijos mientras se muestra la
// ruta (no se insertan en medio), así que no tiene el problema de Android de la spec 006 (M2).
// Margen alrededor del recorrido, en puntos de pantalla. En Android react-native-maps lo recibe
// en píxeles físicos; en iOS, en puntos.
const MARGEN_MAPA_PT = 32;
const margenMapa = Platform.OS === 'android' ? PixelRatio.getPixelSizeForLayoutSize(MARGEN_MAPA_PT) : MARGEN_MAPA_PT;

function RouteMap({ route }: { route: RouteDetail }) {
    const styles = useThemedStyles(makeStyles);
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
                <Polyline coordinates={coordenadas} strokeColor={MAPA.data} strokeWidth={5} zIndex={1} />
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
    const styles = useThemedStyles(makeStyles);
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
        <View style={styles.actionGroup}>
            <Boton
                text={texto}
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
    const styles = useThemedStyles(makeStyles);
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
        <View style={styles.actionGroup}>
            <Text style={styles.ownerTitle}>Tu ruta</Text>
            <View style={styles.ownerRow}>
                <BgBtn
                    text="Editar"
                    style={styles.ownerButton}
                    onPress={() => {
                        if (!ocupado) navigation.navigate('EditRoute', { id: route.id });
                    }}
                />
                <BgBtn
                    text={update.isPending ? 'Guardando...' : archivada ? 'Volver a publicar' : 'Archivar'}
                    style={styles.ownerButton}
                    onPress={cambiarEstado}
                />
                <PrimaryButton variant="danger" text="Borrar" style={styles.ownerButton} onPress={borrar} />
            </View>
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
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const header = <ScreenHeader title="Detalle de ruta" onBack={() => navigation.goBack()} />;

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
            <View style={styles.container}>
                {header}
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            </View>
        );
    }

    if (status !== 'success' || !route) {
        const aviso =
            status === 'offline'
                ? { type: 'offline' as const, title: 'Sin conexión', description: DETAIL_MESSAGES.offline }
                : status === 'unavailable'
                  ? { type: 'error' as const, title: 'Ruta no disponible', description: DETAIL_MESSAGES.unavailable }
                  : { type: 'error' as const, title: 'No se pudo cargar', description: DETAIL_MESSAGES.error };
        return (
            <View style={styles.container}>
                {header}
                <View style={styles.noticeArea}>
                    <Notice {...aviso} />
                </View>
                <View style={styles.actions}>
                    {status === 'unavailable' ? (
                        <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
                    ) : (
                        <PrimaryButton text="Reintentar" onPress={retry} />
                    )}
                </View>
            </View>
        );
    }

    const distanciaATi = formatDistanceFromUser(distanceFromUser(route, user));
    const subtitulo = [
        ACTIVITY_TYPE_LABELS[route.type],
        route.difficulty ? DIFFICULTY_LABELS[route.difficulty] : null,
        route.region,
        distanciaATi,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <View style={styles.container}>
            {header}
            <ScrollView contentContainerStyle={styles.content}>
                <RouteMap route={route} />

                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title} accessibilityRole="header">{route.name}</Text>
                        {route.isMine && (
                            <View style={styles.mineBadge}>
                                <Text style={styles.mineBadgeText}>Tuya</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.subtitle}>{subtitulo}</Text>
                    {/* Las de ejemplo tienen como autor "SendaBC" (spec 006, CA-19) */}
                    <Text style={styles.subtitle}>Por {route.author}</Text>
                    {route.status === 'ARCHIVED' && (
                        <Text style={styles.archived}>Archivada: no aparece en "Rutas".</Text>
                    )}

                    <View style={styles.metrics}>
                        <Metric size="medium" value={formatDistance(route.distanceMeters)} label="Distancia" style={styles.flex} />
                        <Metric
                            size="medium"
                            value={formatElevation(route.elevationGainMeters)}
                            label="Elevación ganada"
                            style={styles.flex}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Perfil de elevación</Text>
                    <ElevationProfile perfil={route.elevationProfile} />

                    {!!route.description && <Text style={styles.description}>{route.description}</Text>}

                    {/* En una ruta propia la barra de abajo lleva sus acciones; favoritas queda aquí */}
                    {route.isMine && <FavoriteButton route={route} />}
                </View>
            </ScrollView>

            <View style={styles.actions}>
                {route.isMine ? (
                    <OwnerActions
                        route={route}
                        onDelete={() => borrar(route.id)}
                        deleteError={remove.error}
                        clearDeleteError={remove.reset}
                    />
                ) : (
                    <FavoriteButton route={route} />
                )}
            </View>
        </View>
    );
}

// El mapa no cambia de estilo con el modo (fuera de alcance, plan R6): sus marcas usan siempre
// los colores del modo claro.
const MAPA = lightColors;

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    loading: {
        marginTop: t.spacing.xxl,
    },
    noticeArea: {
        flex: 1,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    content: {
        paddingBottom: t.spacing.lg,
    },
    // Figma pide 200, pero con el margen fijo del encuadre (MARGEN_MAPA_PT) el mapa de Android no
    // encuadraba el recorrido y se quedaba en una vista muy lejana. A 280 sí (spec 009, T16).
    map: {
        height: 280,
        alignSelf: 'stretch',
    },
    startDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: MAPA.primary,
        borderWidth: 3,
        borderColor: MAPA.surface,
    },
    endDot: {
        width: 16,
        height: 16,
        borderRadius: 3,
        backgroundColor: MAPA.secondary,
        borderWidth: 3,
        borderColor: MAPA.surface,
    },
    body: {
        padding: t.spacing.lg,
        gap: t.spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
    },
    title: {
        ...t.typography.headline,
        flex: 1,
        color: t.colors.text,
    },
    // Etiqueta "Tuya" (CA-12): borde y texto primary, como en Figma.
    mineBadge: {
        paddingHorizontal: t.spacing.sm,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
        borderWidth: 1.5,
        borderColor: t.colors.primary,
    },
    mineBadgeText: {
        ...t.typography.caption,
        fontFamily: fontFamilies.bold,
        color: t.colors.primary,
    },
    subtitle: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    archived: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.bold,
        color: t.colors.secondaryText,
    },
    metrics: {
        flexDirection: 'row',
        gap: t.spacing.lg,
    },
    flex: {
        flex: 1,
    },
    sectionTitle: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    description: {
        ...t.typography.body,
        color: t.colors.text,
    },
    actions: {
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surface,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
    actionGroup: {
        gap: t.spacing.sm,
    },
    ownerTitle: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    ownerRow: {
        flexDirection: 'row',
        gap: t.spacing.sm,
    },
    // Tres botones en una fila: menos relleno lateral para que quepa "Volver a publicar".
    ownerButton: {
        flex: 1,
        paddingHorizontal: t.spacing.sm,
    },
    error: {
        ...t.typography.bodySmall,
        color: t.colors.error,
        textAlign: 'center',
    },
});
