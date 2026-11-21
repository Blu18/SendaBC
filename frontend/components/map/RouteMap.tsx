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
    // Alto de lo que la pantalla pone sobre el borde de abajo del mapa (aviso o tarjeta): el logo y
    // la atribución de Mapbox suben por encima, porque sus términos piden que se vean (T24, P-D).
    ornamentsBottom?: number;
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
    { initialBounds, accessibilityLabel, onCenterChanged, onPress, onReady, ornamentsBottom = 0, children, style },
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

    // Un encuadre pedido antes de que el mapa cargue o tenga tamaño se guarda y se aplica después.
    // Una vez, al abrir Explorar, el primer encuadre no quedó en los 25 km (T24, P-B); no se pudo
    // repetir, y esta es la causa más probable.
    const cargado = useRef(false);
    const conTamano = useRef(false);
    const pendiente = useRef<{ bounds: Bounds; padding: number } | null>(null);
    const aplicar = (bounds: Bounds, padding: number) =>
        camera.current?.fitBounds(bounds.ne, bounds.sw, padding, reducedMotion ? 0 : CAMERA_MOVE_MS);
    const aplicarPendiente = () => {
        if (!pendiente.current || !cargado.current || !conTamano.current) return;
        const { bounds, padding } = pendiente.current;
        pendiente.current = null;
        aplicar(bounds, padding);
    };

    useImperativeHandle(
        ref,
        () => ({
            fitBounds: (bounds, padding = 0) => {
                pendiente.current = { bounds, padding };
                aplicarPendiente();
            },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [reducedMotion]
    );

    // Logo y atribución en su lugar de siempre (abajo a la izquierda), por encima de lo que tape.
    const margen = 8;
    const logoPosition = { left: margen, bottom: margen + ornamentsBottom };
    const attributionPosition = { left: 96, bottom: margen + ornamentsBottom };

    return (
        <View
            style={[styles.map, style]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
            onLayout={(e) => {
                conTamano.current = e.nativeEvent.layout.width > 0 && e.nativeEvent.layout.height > 0;
                aplicarPendiente();
            }}
        >
            <Mapbox.MapView
                style={styles.map}
                {...(styleFailed ? { styleJSON: localMapStyle(colors.background) } : { styleURL })}
                scaleBarEnabled={false}
                compassEnabled={false}
                pitchEnabled={false}
                logoPosition={logoPosition}
                attributionPosition={attributionPosition}
                onMapLoadingError={(error) => {
                    if (error?.type === "style") setStyleFailed(true);
                }}
                onDidFinishLoadingMap={() => {
                    cargado.current = true;
                    aplicarPendiente();
                    onReady?.();
                }}
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
