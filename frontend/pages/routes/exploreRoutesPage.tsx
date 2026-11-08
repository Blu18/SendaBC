import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import MapView, { Marker, Polyline, type MapPressEvent, type Region } from "react-native-maps";
import * as Location from "expo-location";
import { useNavigation, type ParamListBase } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import IconButton from "../../components/ui/IconButton";
import Chip from "../../components/ui/Chip";
import Notice, { type NoticeType } from "../../components/ui/Notice";
import { useLocationPermission } from "../../hooks/activity/locationPermission.hook";
import { useNearbyRoutes } from "../../hooks/routes/useNearbyRoutes";
import type { ActivityType } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import type { Coordinates } from "../../lib/metrics/geo";
import type { NearbyRoute } from "../../lib/routes/api";
import { BAJA_CALIFORNIA_REGION, DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from "../../lib/routes/constants";
import {
    DIFFICULTY_LABELS,
    formatDistanceFromUser,
    NEARBY_MESSAGES,
    TYPE_FILTER_OPTIONS,
} from "../../lib/routes/format";
import { distanceFromUser, hasMovedEnough, pathToCoordinates, regionAround, regionForPath } from "../../lib/routes/geo";
import { guardadasFueraDeVista } from "../../lib/routes/offline";
import { avisoDeGuardado } from "../../lib/routes/status";
import { fontFamilies, lightColors, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// Ubicación del permiso: 'pending' mientras se pide y se obtiene la posición al abrir.
type LocationState = { kind: 'pending' } | { kind: 'denied' } | { kind: 'granted'; user: Coordinates };

// Un toque en un recorrido o marcador puede llegar también al mapa como toque en vacío; este
// margen evita que la selección se quite justo después de hacerla (CA-8).
const OVERLAY_PRESS_GRACE_MS = 300;

const centerOf = (region: Region): Coordinates => ({
    latitude: region.latitude,
    longitude: region.longitude,
});

// Una posición reciente basta para centrar el mapa y es casi inmediata; pedir una nueva al GPS
// tardaba más de 10 s (M4).
const MAX_EDAD_POSICION_MS = 5 * 60_000;

async function currentPosition(): Promise<Coordinates> {
    const reciente = await Location.getLastKnownPositionAsync({ maxAge: MAX_EDAD_POSICION_MS });
    const { coords } =
        reciente ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { latitude: coords.latitude, longitude: coords.longitude };
}

// El mapa no cambia de estilo con el modo (fuera de alcance, plan R6): sus marcas usan siempre
// los colores del modo claro.
const MAPA = lightColors;

// Tarjeta de la ruta seleccionada (CA-6, CA-7, CA-19). Sin ubicación no hay "A X km de ti" (CA-14).
// "Ver detalle" abre el recorrido completo y el perfil (spec 007, CA-10).
function RouteCard({
    route,
    user,
    onDetail,
}: {
    route: NearbyRoute;
    user: Coordinates | null;
    onDetail: () => void;
}) {
    const styles = useThemedStyles(makeStyles);
    const distanciaATi = formatDistanceFromUser(distanceFromUser(route, user));
    const subtitulo = [
        ACTIVITY_TYPE_LABELS[route.type],
        route.difficulty ? DIFFICULTY_LABELS[route.difficulty] : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{route.name}</Text>
                {route.isMine && (
                    <View style={styles.mineBadge}>
                        <Text style={styles.mineBadgeText}>Tuya</Text>
                    </View>
                )}
            </View>
            <Text style={styles.cardSubtitle}>{subtitulo}</Text>
            {distanciaATi && <Text style={styles.cardDistance}>{distanciaATi}</Text>}
            <View style={styles.cardStats}>
                <View>
                    <Text style={styles.cardStatValue}>{formatDistance(route.distanceMeters)}</Text>
                    <Text style={styles.cardStatLabel}>Distancia</Text>
                </View>
                <View>
                    <Text style={styles.cardStatValue}>{formatElevation(route.elevationGainMeters)}</Text>
                    <Text style={styles.cardStatLabel}>Elevación ganada</Text>
                </View>
            </View>
            <Text style={styles.cardSubtitle}>Por {route.author}</Text>
            <PrimaryButton text="Ver detalle" onPress={onDetail} />
        </View>
    );
}

// Como pestaña, la pantalla ya no se desmonta al cambiar de pestaña (spec 009). Para que cada
// vez que se abre empiece igual que antes (centrada en el usuario, 25 km y todas; spec 006,
// CA-1, CA-11 y CA-12), se vuelve a montar al entrar desde otra pestaña. Al volver del detalle,
// de Mis rutas o de Mis favoritas conserva el mapa, como cuando era parte del stack.
export default function ExploreRoutesPage() {
    const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
    const [apertura, setApertura] = useState(0);

    useEffect(
        () =>
            navigation.addListener('tabPress', () => {
                if (!navigation.isFocused()) setApertura((n) => n + 1);
            }),
        [navigation]
    );

    return <ExploreRoutes key={apertura} />;
}

// Catálogo de rutas cercanas en un mapa (spec 006).
function ExploreRoutes() {
    const navigation = useNavigation();
    const mapRef = useRef<MapView>(null);
    const lastOverlayPress = useRef(0);
    const { request } = useLocationPermission();
    const { routes, status, savedAt, lastSearch, search, retry } = useNearbyRoutes();
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);

    const [mapReady, setMapReady] = useState(false);
    const [location, setLocation] = useState<LocationState>({ kind: 'pending' });
    const [mapCenter, setMapCenter] = useState<Coordinates>(centerOf(BAJA_CALIFORNIA_REGION));
    // Cada vez que se abre la pantalla el radio vuelve a 25 km y se muestran todas (CA-11, CA-12).
    const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
    const [type, setType] = useState<ActivityType | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const user = location.kind === 'granted' ? location.user : null;

    const buscarEn = useCallback(
        (center: Coordinates, opciones: { radiusKm: number; type: ActivityType | null }) => {
            setSelectedId(null);
            search({ center, ...opciones });
        },
        [search]
    );

    // Al abrir: con permiso, centrar en el usuario y buscar (CA-1); sin permiso, todo Baja
    // California sin buscar (CA-14). Se espera al mapa para que animateToRegion no se pierda.
    useEffect(() => {
        if (!mapReady) return;
        let cancelado = false;
        (async () => {
            try {
                const permiso = await request();
                if (!permiso.granted) {
                    if (!cancelado) setLocation({ kind: 'denied' });
                    return;
                }
                const posicion = await currentPosition();
                if (cancelado) return;
                setLocation({ kind: 'granted', user: posicion });
                mapRef.current?.animateToRegion(regionAround(posicion, DEFAULT_RADIUS_KM), 600);
                setMapCenter(posicion);
                buscarEn(posicion, { radiusKm: DEFAULT_RADIUS_KM, type: null });
            } catch (e) {
                // Sin posición (GPS apagado) se explora igual que sin permiso.
                console.log('Error obteniendo la ubicación:', e);
                if (!cancelado) setLocation({ kind: 'denied' });
            }
        })();
        return () => {
            cancelado = true;
        };
        // Solo al abrir la pantalla.
    }, [mapReady]);

    // La selección desaparece si la ruta ya no está en los resultados.
    useEffect(() => {
        if (selectedId && !routes.some((r) => r.id === selectedId)) setSelectedId(null);
    }, [routes, selectedId]);

    const selected = useMemo(() => routes.find((r) => r.id === selectedId) ?? null, [routes, selectedId]);
    // Número de la búsqueda actual: cambia las keys de todo lo dibujado en cada búsqueda nueva.
    const busqueda = lastSearch?.n ?? 0;

    // Sin conexión, la búsqueda guardada puede ser de otro lugar: si ninguna de sus rutas queda
    // dentro de la búsqueda actual, el mapa se mueve hacia ellas para que se vean (spec 011, CA-53).
    useEffect(() => {
        if (status !== 'saved' || !lastSearch) return;
        if (!guardadasFueraDeVista(routes, lastSearch.center, lastSearch.radiusKm)) return;
        const inicios = routes.map((r): [number, number] => [r.start.longitude, r.start.latitude]);
        mapRef.current?.animateToRegion(regionForPath(inicios, routes[0].start), 600);
        // Una vez por búsqueda.
    }, [status, busqueda]);

    // En Android, un marcador con vista propia y tracksViewChanges={false} se queda con la imagen
    // tomada antes de dibujar sus hijos, y el punto dentro del área de 48 dp no se veía. Los
    // marcadores siguen su vista mientras se dibujan y se congelan después, para no redibujarlos
    // en cada cuadro del mapa.
    const [dibujandoMarcadores, setDibujandoMarcadores] = useState(true);
    useEffect(() => {
        setDibujandoMarcadores(true);
        const t = setTimeout(() => setDibujandoMarcadores(false), 1000);
        return () => clearTimeout(t);
    }, [routes]);

    const seleccionar = (id: string) => {
        lastOverlayPress.current = Date.now();
        setSelectedId(id);
    };

    // Tocar una zona vacía del mapa quita la selección (CA-8).
    const onMapPress = (e: MapPressEvent) => {
        if (e.nativeEvent.action === 'marker-press') return;
        if (Date.now() - lastOverlayPress.current < OVERLAY_PRESS_GRACE_MS) return;
        setSelectedId(null);
    };

    // Al cambiar el radio se busca de nuevo en el centro actual del mapa (CA-11). Antes de la
    // primera búsqueda (sin permiso) solo se elige.
    const cambiarRadio = (km: number) => {
        setRadiusKm(km);
        if (!lastSearch) return;
        mapRef.current?.animateToRegion(regionAround(mapCenter, km), 400);
        buscarEn(mapCenter, { radiusKm: km, type });
    };

    const cambiarTipo = (nuevo: ActivityType | null) => {
        setType(nuevo);
        if (lastSearch) buscarEn(mapCenter, { radiusKm, type: nuevo });
    };

    // "Buscar en esta zona" (CA-9).
    const buscarAqui = () => buscarEn(mapCenter, { radiusKm, type });

    // Volver a centrar en mi ubicación y buscar ahí (CA-10).
    const recentrar = async () => {
        let posicion = user;
        try {
            posicion = await currentPosition();
            setLocation({ kind: 'granted', user: posicion });
        } catch (e) {
            console.log('Error actualizando la ubicación:', e);
        }
        if (!posicion) return;
        mapRef.current?.animateToRegion(regionAround(posicion, radiusKm), 600);
        setMapCenter(posicion);
        buscarEn(posicion, { radiusKm, type });
    };

    const mostrarBuscarAqui =
        location.kind !== 'pending' &&
        status !== 'loading' &&
        hasMovedEnough(lastSearch?.center ?? null, mapCenter, radiusKm);

    // Avisos de la búsqueda (CA-13 a CA-16), abajo sobre el mapa como en Figma. Con la búsqueda
    // guardada, de cuándo son los datos (spec 011, CA-53); si no hay rutas guardadas del tipo
    // elegido, también lo dice.
    const aviso: { type: NoticeType; title: string; description: string } | null =
        status === 'saved' && savedAt
            ? {
                  type: 'offline',
                  title: 'Datos guardados',
                  description:
                      routes.length === 0
                          ? `${NEARBY_MESSAGES.savedEmpty} ${avisoDeGuardado(savedAt)}`
                          : avisoDeGuardado(savedAt),
              }
            : status === 'empty'
            ? { type: 'info', title: 'Sin rutas cerca', description: NEARBY_MESSAGES.empty }
            : status === 'offline'
              ? { type: 'offline', title: 'Sin conexión', description: NEARBY_MESSAGES.offline }
              : status === 'error'
                ? { type: 'error', title: 'No se pudo cargar', description: NEARBY_MESSAGES.error }
                : location.kind === 'denied' && status === 'idle'
                  ? { type: 'info', title: 'Sin tu ubicación', description: NEARBY_MESSAGES.noPermission }
                  : null;

    return (
        <View style={styles.screen}>
            {/* Mis favoritas y Mis rutas pasan aquí desde el menú del inicio (spec 009, plan) */}
            <ScreenHeader
                title="Rutas"
                actions={
                    <>
                        <IconButton
                            icon="heart-outline"
                            accessibilityLabel="Mis favoritas"
                            onPress={() => navigation.navigate('Favorites')}
                        />
                        <IconButton
                            icon="map-marker-path"
                            accessibilityLabel="Mis rutas"
                            onPress={() => navigation.navigate('MyRoutes')}
                        />
                    </>
                }
            />
            <View style={styles.container}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFill}
                    initialRegion={BAJA_CALIFORNIA_REGION}
                    showsUserLocation={user !== null}
                    showsMyLocationButton={false}
                    toolbarEnabled={false}
                    // Seleccionar una ruta no mueve la cámara: si no, aparecía "Buscar en esta zona"
                    // sin que el usuario moviera el mapa (CA-9).
                    moveOnMarkerPress={false}
                    onMapReady={() => setMapReady(true)}
                    onRegionChangeComplete={(region) => setMapCenter(centerOf(region))}
                    onPress={onMapPress}
                >
                    {/* react-native-maps 1.27 en Android guarda cada elemento nuevo con
                        features.set(index): si se inserta en medio de la lista, el que estaba ahí queda
                        dibujado pero ya nadie lo borra (M2, M8). Por eso solo se agrega al final:
                        - los recorridos y puntos de una búsqueda no cambian mientras dura (su key lleva
                          el número de búsqueda; una búsqueda nueva quita todos y agrega los nuevos);
                        - la selección es un recorrido y un punto extra, siempre los últimos (CA-8). */}
                    {routes
                        .filter((route) => route.path.length >= 2)
                        .map((route) => (
                            <Polyline
                                key={`${busqueda}-${route.id}-path`}
                                coordinates={pathToCoordinates(route.path)}
                                strokeColor={MAPA.primary}
                                strokeWidth={3}
                                zIndex={1}
                                tappable
                                onPress={() => seleccionar(route.id)}
                            />
                        ))}
                    {routes.map((route) => (
                        <Marker
                            key={`${busqueda}-${route.id}-start`}
                            coordinate={route.start}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={3}
                            // Vista propia y no pinColor: en Android pinColor solo toma el tono y el
                            // verde de la paleta salía claro.
                            tracksViewChanges={dibujandoMarcadores}
                            onPress={() => seleccionar(route.id)}
                        >
                            <View style={styles.markerHit}>
                                <View style={styles.startDot} />
                            </View>
                        </Marker>
                    ))}
                    {selected && selected.path.length >= 2 && (
                        <Polyline
                            key={`${busqueda}-${selected.id}-path-sel`}
                            coordinates={pathToCoordinates(selected.path)}
                            strokeColor={MAPA.data}
                            strokeWidth={6}
                            zIndex={2}
                            tappable
                            onPress={() => seleccionar(selected.id)}
                        />
                    )}
                    {selected && (
                        <Marker
                            key={`${busqueda}-${selected.id}-start-sel`}
                            coordinate={selected.start}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={4}
                            // Es uno solo: puede seguir los cambios de su vista sin costo apreciable, y
                            // así Android no se queda con una imagen tomada antes de dibujarla.
                            tracksViewChanges
                            onPress={() => seleccionar(selected.id)}
                        >
                            <View style={styles.markerHit}>
                                <View style={styles.startRing} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {/* Filtros arriba: tipo (CA-12) y radio (CA-11) */}
                <View style={styles.top} pointerEvents="box-none">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
                        {TYPE_FILTER_OPTIONS.map((opcion) => (
                            <Chip
                                key={opcion.label}
                                text={opcion.label}
                                selected={type === opcion.value}
                                style={styles.floating}
                                onPress={() => cambiarTipo(opcion.value)}
                            />
                        ))}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
                        {RADIUS_OPTIONS_KM.map((km) => (
                            <Chip
                                key={km}
                                text={`${km} km`}
                                selected={radiusKm === km}
                                style={styles.floating}
                                onPress={() => cambiarRadio(km)}
                            />
                        ))}
                    </ScrollView>

                    {/* "Buscar en esta zona" al centro (CA-9) y centrar en mi ubicación a la derecha,
                        solo con permiso (CA-10) */}
                    <View style={styles.mapActions} pointerEvents="box-none">
                        {mostrarBuscarAqui && (
                            <PrimaryButton text="Buscar en esta zona" style={[styles.searchHere, styles.floating]} onPress={buscarAqui} />
                        )}
                        {user && (
                            <IconButton
                                icon="crosshairs-gps"
                                accessibilityLabel="Centrar en mi ubicación"
                                onPress={recentrar}
                                style={[styles.recenter, styles.floating]}
                            />
                        )}
                    </View>
                </View>

                {(location.kind === 'pending' || status === 'loading') && (
                    <View style={styles.loadingArea} pointerEvents="none">
                        <View style={[styles.loading, styles.floating]}>
                            <ActivityIndicator color={theme.colors.primary} />
                            <Text style={styles.loadingText}>
                                {location.kind === 'pending' ? 'Buscando tu ubicación…' : 'Buscando rutas…'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Abajo: el aviso o la tarjeta de la ruta seleccionada */}
                <View style={styles.bottom} pointerEvents="box-none">
                    <Appear style={styles.avisoGroup}>
                        {aviso && (
                            <>
                                <Notice {...aviso} />
                                {(status === 'error' || status === 'offline' || status === 'saved') && (
                                    <PrimaryButton text="Reintentar" onPress={retry} />
                                )}
                            </>
                        )}
                    </Appear>
                    {selected && (
                        <RouteCard
                            route={selected}
                            user={user}
                            onDetail={() => navigation.navigate('RouteDetail', { id: selected.id })}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    floating: {
        ...t.shadows.floating,
    },
    top: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: t.spacing.md,
        gap: t.spacing.sm,
    },
    // Ancho completo para que los chips se deslicen si no caben
    chipRow: {
        alignSelf: 'stretch',
        flexGrow: 0,
    },
    chips: {
        paddingHorizontal: t.spacing.lg,
        // Aire abajo para que no se corte la sombra
        paddingBottom: t.spacing.xs,
        gap: t.spacing.sm,
    },
    mapActions: {
        minHeight: t.touchMin,
        paddingHorizontal: t.spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchHere: {
        alignSelf: 'center',
    },
    recenter: {
        position: 'absolute',
        right: t.spacing.lg,
        backgroundColor: t.colors.surface,
    },
    loadingArea: {
        ...StyleSheet.absoluteFill,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.sm,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.surface,
    },
    loadingText: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    avisoGroup: {
        gap: t.spacing.sm,
    },
    bottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: t.spacing.lg,
        gap: t.spacing.sm,
    },
    // Área de toque de los marcadores: el punto mide 18 dp, pero el marcador entero (esta vista
    // transparente) se puede tocar, y debe medir 48 × 48 (spec 009, CA-13).
    markerHit: {
        width: t.touchMin,
        height: t.touchMin,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Marcador del inicio de cada ruta (CA-2): punto con el color de la paleta.
    startDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: MAPA.surface,
        backgroundColor: MAPA.primary,
    },
    // Anillo alrededor del punto de la ruta seleccionada: se ve igual quede encima o debajo del
    // punto normal (en Android el zIndex entre marcadores no siempre se respeta).
    startRing: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 5,
        borderColor: MAPA.data,
        backgroundColor: 'transparent',
    },
    card: {
        padding: t.spacing.lg,
        gap: t.spacing.sm,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
        ...t.shadows.floating,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
    },
    cardTitle: {
        ...t.typography.title,
        fontFamily: fontFamilies.bold,
        flex: 1,
        color: t.colors.text,
    },
    // Etiqueta "Tuya" (spec 007, CA-12): borde y texto primary, como en el detalle.
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
    cardSubtitle: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    cardDistance: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.bold,
        color: t.colors.data,
    },
    cardStats: {
        flexDirection: 'row',
        gap: t.spacing.xl,
    },
    cardStatValue: {
        ...t.typography.title,
        fontFamily: fontFamilies.bold,
        fontVariant: ['tabular-nums'],
        color: t.colors.text,
    },
    cardStatLabel: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
});
