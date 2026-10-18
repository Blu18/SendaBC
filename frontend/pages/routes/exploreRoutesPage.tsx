import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from "react-native";
import MapView, { Marker, Polyline, type MapPressEvent, type Region } from "react-native-maps";
import * as Location from "expo-location";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
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
import { distanceFromUser, hasMovedEnough, pathToCoordinates, regionAround } from "../../lib/routes/geo";
import { colors } from "../../lib/theme/colors";

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

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, { opacity: pressed ? 0.7 : 1 }]}
        >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </Pressable>
    );
}

// Tarjeta de la ruta seleccionada (CA-6, CA-7, CA-19). Sin ubicación no hay "A X km de ti" (CA-14).
function RouteCard({ route, user }: { route: NearbyRoute; user: Coordinates | null }) {
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
            <View style={styles.cardStats}>
                <View style={styles.cardStat}>
                    <Text style={styles.cardStatValue}>{formatDistance(route.distanceMeters)}</Text>
                    <Text style={styles.cardStatLabel}>Distancia</Text>
                </View>
                <View style={styles.cardStat}>
                    <Text style={styles.cardStatValue}>{formatElevation(route.elevationGainMeters)}</Text>
                    <Text style={styles.cardStatLabel}>Elevación ganada</Text>
                </View>
            </View>
            <Text style={styles.cardDetail}>Por {route.author}</Text>
            {distanciaATi && <Text style={styles.cardDetail}>{distanciaATi}</Text>}
        </View>
    );
}

// Catálogo de rutas cercanas en un mapa (spec 006).
export default function ExploreRoutesPage() {
    const mapRef = useRef<MapView>(null);
    const lastOverlayPress = useRef(0);
    const { request } = useLocationPermission();
    const { routes, status, lastSearch, search, retry } = useNearbyRoutes();

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

    const aviso =
        status === 'empty'
            ? NEARBY_MESSAGES.empty
            : status === 'offline'
              ? NEARBY_MESSAGES.offline
              : status === 'error'
                ? NEARBY_MESSAGES.error
                : location.kind === 'denied' && status === 'idle'
                  ? NEARBY_MESSAGES.noPermission
                  : null;

    return (
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
                {/* En Android un Polyline no aplica bien los cambios de color o grosor y deja copias
                    viejas dibujadas (M2, M8). Por eso nunca se actualiza: al cambiar la selección se
                    vuelve a montar con otra key, en el orden fijo de la respuesta. La seleccionada
                    sube con zIndex (CA-8). */}
                {routes
                    .filter((route) => route.path.length >= 2)
                    .map((route) => {
                        const activa = route.id === selectedId;
                        return (
                            <Polyline
                                key={`${route.id}-path-${activa ? 'on' : 'off'}`}
                                coordinates={pathToCoordinates(route.path)}
                                strokeColor={activa ? colors.data : colors.primary}
                                strokeWidth={activa ? 6 : 3}
                                zIndex={activa ? 2 : 1}
                                tappable
                                onPress={() => seleccionar(route.id)}
                            />
                        );
                    })}
                {routes.map((route) => {
                    const activa = route.id === selectedId;
                    return (
                        <Marker
                            // Cambiar de key al seleccionar vuelve a dibujar el punto (con
                            // tracksViewChanges en false Android no lo actualiza solo).
                            key={`${route.id}-start-${activa ? 'on' : 'off'}`}
                            coordinate={route.start}
                            anchor={{ x: 0.5, y: 0.5 }}
                            zIndex={activa ? 4 : 3}
                            // Vista propia y no pinColor: en Android pinColor solo toma el tono
                            // y el verde de la paleta salía claro.
                            tracksViewChanges={false}
                            onPress={() => seleccionar(route.id)}
                        >
                            <View style={[styles.startDot, activa && styles.startDotActive]} />
                        </Marker>
                    );
                })}
            </MapView>

            {/* Filtros arriba: tipo (CA-12) y radio (CA-11) */}
            <View style={styles.top} pointerEvents="box-none">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
                    {TYPE_FILTER_OPTIONS.map((opcion) => (
                        <Chip
                            key={opcion.label}
                            label={opcion.label}
                            selected={type === opcion.value}
                            onPress={() => cambiarTipo(opcion.value)}
                        />
                    ))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
                    {RADIUS_OPTIONS_KM.map((km) => (
                        <Chip key={km} label={`${km} km`} selected={radiusKm === km} onPress={() => cambiarRadio(km)} />
                    ))}
                </ScrollView>

                {mostrarBuscarAqui && (
                    <PrimaryButton text="Buscar en esta zona" style={styles.searchHere} onPress={buscarAqui} />
                )}

                {(location.kind === 'pending' || status === 'loading') && (
                    <View style={styles.loading}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={styles.loadingText}>
                            {location.kind === 'pending' ? 'Buscando tu ubicación…' : 'Buscando rutas…'}
                        </Text>
                    </View>
                )}

                {aviso && (
                    <View style={styles.notice}>
                        <Text style={styles.noticeText}>{aviso}</Text>
                        {(status === 'error' || status === 'offline') && (
                            <PrimaryButton text="Reintentar" style={styles.retry} onPress={retry} />
                        )}
                    </View>
                )}
            </View>

            {/* Abajo: botón para volver a centrar (solo con permiso, CA-10) y la tarjeta */}
            <View style={styles.bottom} pointerEvents="box-none">
                {user && (
                    <Pressable
                        onPress={recentrar}
                        accessibilityRole="button"
                        accessibilityLabel="Centrar en mi ubicación"
                        style={({ pressed }) => [styles.recenter, { opacity: pressed ? 0.7 : 1 }]}
                    >
                        <Text style={styles.recenterText}>◎</Text>
                    </Pressable>
                )}
                {selected && <RouteCard route={selected} user={user} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    top: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        gap: 8,
        alignItems: 'center',
    },
    // Ancho completo para que los chips se deslicen si no caben
    chipRow: {
        alignSelf: 'stretch',
        flexGrow: 0,
    },
    chips: {
        paddingHorizontal: 12,
        gap: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.background,
    },
    chipSelected: {
        backgroundColor: colors.primary,
    },
    chipText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
    },
    chipTextSelected: {
        color: colors.background,
    },
    searchHere: {
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 18,
    },
    loading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        backgroundColor: colors.background,
    },
    loadingText: {
        color: colors.text,
    },
    notice: {
        marginHorizontal: 16,
        padding: 14,
        gap: 10,
        borderRadius: 12,
        backgroundColor: colors.background,
        alignSelf: 'stretch',
    },
    noticeText: {
        fontSize: 15,
        color: colors.text,
        textAlign: 'center',
    },
    retry: {
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 8,
    },
    bottom: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 16,
        gap: 12,
    },
    recenter: {
        alignSelf: 'flex-end',
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    recenterText: {
        fontSize: 24,
        color: colors.primary,
    },
    // Marcador del inicio de cada ruta (CA-2): punto con el color de la paleta.
    startDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 3,
        borderColor: colors.background,
        backgroundColor: colors.primary,
    },
    startDotActive: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.data,
    },
    card: {
        padding: 16,
        gap: 6,
        borderRadius: 16,
        backgroundColor: colors.background,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    cardTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    mineBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: colors.secondary,
    },
    mineBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.background,
    },
    cardSubtitle: {
        fontSize: 15,
        color: colors.textMuted,
    },
    cardStats: {
        flexDirection: 'row',
        marginVertical: 4,
    },
    cardStat: {
        flex: 1,
        gap: 2,
    },
    cardStatValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    cardStatLabel: {
        fontSize: 13,
        color: colors.textMuted,
    },
    cardDetail: {
        fontSize: 14,
        color: colors.textMuted,
    },
});
