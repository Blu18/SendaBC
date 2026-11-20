import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Mapbox from "@rnmapbox/maps";
import MapErrorBoundary from "./MapErrorBoundary";
import { useMapConnection } from "../../hooks/map/useMapConnection";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme } from "../../hooks/theme/useTheme";
import { ROUTE_MAP_UNAVAILABLE } from "../../lib/map/messages";
import { localMapStyle, mapStyle } from "../../lib/map/style";
import type { LngLat } from "../../lib/map/track";
import type { Coordinates } from "../../lib/metrics/geo";
import type { Bounds } from "../../lib/routes/geo";

// Transición de la cámara al encuadrar: la misma que tenía Explorar antes de Mapbox.
const CAMERA_MOVE_MS = 600;

export type RouteMapHandle = {
    // Encuadra los límites con un margen en puntos de pantalla (CA-31, CA-32).
    fitBounds: (bounds: Bounds, padding?: number) => void;
};

type Props = {
    // Primer encuadre, antes de cualquier movimiento.
    initialBounds: Bounds;
    // Lo que describe el mapa al lector de pantalla.
    accessibilityLabel: string;
    // Centro del mapa cada vez que deja de moverse (para "Buscar en esta zona", spec 006, CA-9).
    onCenterChanged?: (center: Coordinates) => void;
    // Toque en una zona vacía del mapa (quita la selección, spec 006, CA-8).
    onPress?: () => void;
    // El mapa terminó de cargar y ya acepta movimientos de cámara.
    onReady?: () => void;
    // Capas y fuentes de Mapbox: recorridos, marcadores y la posición.
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
};

// Mapa de Explorar y del detalle de ruta (spec 013, CA-30). Usa el mismo proveedor y estilo que el
// de la grabación (spec 010): Outdoors en claro y Dark en oscuro, en 2D. Con el mismo
// styleURL, el SDK usa sin red las zonas descargadas en la 011 (CA-34). Fuera de ellas y sin red,
// o si el estilo no carga, queda un fondo liso en el que se siguen dibujando las rutas. No usa la
// ubicación del SDK: la pantalla dibuja la posición que ya obtuvo (plan D4).
const RouteMap = forwardRef<RouteMapHandle, Props>(function RouteMap(props, ref) {
    return (
        <MapErrorBoundary notice={ROUTE_MAP_UNAVAILABLE}>
            <RouteMapView {...props} ref={ref} />
        </MapErrorBoundary>
    );
});

export default RouteMap;

const RouteMapView = forwardRef<RouteMapHandle, Props>(function RouteMapView(
    { initialBounds, accessibilityLabel, onCenterChanged, onPress, onReady, children, style },
    ref
) {
    const { colors, scheme } = useTheme();
    const { styleURL } = mapStyle(scheme);
    const camera = useRef<Mapbox.Camera>(null);
    const reducedMotion = useReducedMotion();
    const online = useMapConnection();
    // Si el estilo no carga se usa uno local; se reintenta al volver la red (como spec 010, CA-15, CA-16).
    const [styleFailed, setStyleFailed] = useState(false);
    useEffect(() => {
        if (online) setStyleFailed(false);
    }, [online]);

    useImperativeHandle(
        ref,
        () => ({
            fitBounds: ({ ne, sw }, padding = 0) =>
                camera.current?.fitBounds(ne, sw, padding, reducedMotion ? 0 : CAMERA_MOVE_MS),
        }),
        [reducedMotion]
    );

    return (
        <View style={[styles.map, style]} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
            <Mapbox.MapView
                style={styles.map}
                {...(styleFailed ? { styleJSON: localMapStyle(colors.background) } : { styleURL })}
                scaleBarEnabled={false}
                compassEnabled={false}
                pitchEnabled={false}
                onMapLoadingError={(error) => {
                    if (error?.type === "style") setStyleFailed(true);
                }}
                onDidFinishLoadingMap={onReady}
                onMapIdle={(state) => {
                    const [longitude, latitude] = state.properties.center as LngLat;
                    onCenterChanged?.({ latitude, longitude });
                }}
                onPress={onPress ? () => onPress() : undefined}
            >
                <Mapbox.Camera
                    ref={camera}
                    defaultSettings={{ bounds: { ne: initialBounds.ne, sw: initialBounds.sw } }}
                />
                {/* Sin sombreado ni 3D: es un mapa plano, como la grabación en 2D (spec 010, T11). */}
                {children}
            </Mapbox.MapView>
        </View>
    );
});

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
});
