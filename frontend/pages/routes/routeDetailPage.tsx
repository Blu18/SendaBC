import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import Mapbox from "@rnmapbox/maps";
import * as Location from "expo-location";
import BottomBar from "../../components/ui/BottomBar";
import Appear from "../../components/ui/Appear";
import MapViewToggle from "../../components/map/MapViewToggle";
import RouteMap from "../../components/map/RouteMap";
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
import { boundsForPath, distanceFromUser } from "../../lib/routes/geo";
import { pointFeature, routeLines } from "../../lib/routes/mapFeatures";
import { avisoDeGuardado, mensajeDeFallo, type RouteActionFailure } from "../../lib/routes/status";
import { fontFamilies, type Theme } from "../../lib/theme";
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

// Recorrido completo con su inicio y su final (spec 007, CA-10), en el mapa de Mapbox con el estilo
// de la grabación (spec 013, CA-30, CA-32). El encuadre inicial ya trae el margen alrededor del
// recorrido (boundsForPath), así que no hace falta encuadrar otra vez al cargar.
function RouteDetailMap({ route }: { route: RouteDetail }) {
    const styles = useThemedStyles(makeStyles);
    const { colors } = useTheme();
    const linea = useMemo(() => routeLines([{ id: route.id, path: route.path }]), [route.id, route.path]);
    const ultimo = route.path[route.path.length - 1];
    const inicio = useMemo(() => pointFeature("inicio", route.start), [route.start]);
    const final = useMemo(
        () => (route.path.length >= 2 ? pointFeature("final", { latitude: ultimo[1], longitude: ultimo[0] }) : null),
        [route.path, ultimo]
    );

    // Empieza en 3D cada vez que se abre el detalle y no recuerda la vista (spec 015, CA-13).
    const [view, setView] = useState<"3D" | "2D">("3D");
    // Sin relieve disponible (sin red y sin zona descargada) el botón de vista no aparece (CA-16).
    const [relieve, setRelieve] = useState(true);

    return (
        <View style={styles.map}>
        <RouteMap
            style={StyleSheet.absoluteFill}
            initialBounds={boundsForPath(route.path, route.start)}
            accessibilityLabel={`Mapa del recorrido de ${route.name}`}
            view={view}
            onReliefAvailable={setRelieve}
        >
            <Mapbox.ShapeSource id="recorrido" shape={linea}>
                <Mapbox.LineLayer
                    id="recorrido-linea"
                    style={{ lineColor: colors.data, lineWidth: 5, lineCap: "round", lineJoin: "round" }}
                />
            </Mapbox.ShapeSource>
            {final && (
                <Mapbox.ShapeSource id="final" shape={final}>
                    <Mapbox.CircleLayer
                        id="final-punto"
                        style={{ circleRadius: 8, circleColor: colors.secondary, circleStrokeWidth: 3, circleStrokeColor: colors.surface }}
                    />
                </Mapbox.ShapeSource>
            )}
            <Mapbox.ShapeSource id="inicio" shape={inicio}>
                <Mapbox.CircleLayer
                    id="inicio-punto"
                    style={{ circleRadius: 8, circleColor: colors.primary, circleStrokeWidth: 3, circleStrokeColor: colors.surface }}
                />
            </Mapbox.ShapeSource>
        </RouteMap>
            {/* Vista del mapa en la esquina, fuera del mapa para que TalkBack la encuentre (CA-12, CA-17).
                Sin relieve disponible no aparece (CA-16). */}
            {relieve && (
                <MapViewToggle
                    view={view}
                    onChange={(v) => setView(v === "2D" ? "2D" : "3D")}
                    allowNone={false}
                />
            )}
        </View>
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
// solo aquí (requisito de datos móviles). Sin conexión, con el detalle guardado se muestra igual,
// con un aviso de cuándo es; el recorrido se dibuja aunque falte el mapa de fondo (spec 011,
// CA-55). Favoritas y las acciones de la ruta propia avisan que necesitan conexión (CA-58).
export default function RouteDetailPage({ route: navRoute }: Props) {
    const { id } = navRoute.params;
    const navigation = useNavigation();
    const { route, savedAt, status, retry } = useRouteDetail(id);
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

    if ((status !== 'success' && status !== 'saved') || !route) {
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
                    <Appear>
                        <Notice {...aviso} />
                    </Appear>
                </View>
                <BottomBar>
                    {status === 'unavailable' ? (
                        <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
                    ) : (
                        <PrimaryButton text="Reintentar" onPress={retry} />
                    )}
                </BottomBar>
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
                <RouteDetailMap route={route} />

                <View style={styles.body}>
                    {status === 'saved' && savedAt && (
                        <Appear style={styles.actionGroup}>
                            <Notice type="offline" title="Datos guardados" description={avisoDeGuardado(savedAt)} />
                            <BgBtn text="Reintentar" onPress={retry} />
                        </Appear>
                    )}
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

            <BottomBar>
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
            </BottomBar>
        </View>
    );
}

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
    // Figma pide 200; con el mapa anterior (Google) el encuadre en Android necesitaba 280 (spec 009, T16).
    // Se conserva con Mapbox para no cambiar el diseño ya probado (spec 013, T10).
    map: {
        height: 280,
        alignSelf: 'stretch',
        // El botón de vista va arriba a la derecha, como en Figma.
        alignItems: 'flex-end',
        padding: t.spacing.md,
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
