import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Mapbox from "@rnmapbox/maps";
import MapErrorBoundary from "./MapErrorBoundary";
import { useMapConnection } from "../../hooks/map/useMapConnection";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme } from "../../hooks/theme/useTheme";
import { ROUTE_MAP_UNAVAILABLE } from "../../lib/map/messages";
import { PITCH_3D, TERRAIN_EXAGGERATION } from "../../lib/map/camera";
import { esReposoViejo } from "../../lib/map/idle";
import { TERRAIN_URL, localMapStyle, mapStyle } from "../../lib/map/style";
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
    // Vista del mapa (spec 015, CA-12 a CA-14). La pantalla guarda la vista y pone el botón.
    // Por defecto 2D, como antes de la 015.
    view?: "3D" | "2D";
    // Avisa si el mapa puede mostrar el relieve. Sin el estilo de Mapbox (sin red y sin zona
    // descargada) queda plano, y la pantalla esconde el botón de vista, como la grabación
    // (spec 015, CA-16).
    onReliefAvailable?: (available: boolean) => void;
    // Capas y fuentes de Mapbox: recorridos, marcadores y la posición.
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
};

// Mapa de Explorar y del detalle de ruta (spec 013, CA-30). Usa el mismo proveedor y estilo que el
// de la grabación (spec 010): Outdoors en claro y Dark en oscuro, en 2D o en 3D con el mismo relieve
// que la grabación (spec 015, plan D6). Con el mismo
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
    { initialBounds, accessibilityLabel, onCenterChanged, onPress, onReady, ornamentsBottom = 0, view = "2D", onReliefAvailable, children, style },
    ref
) {
    const { colors, scheme } = useTheme();
    const { styleURL, hillshade } = mapStyle(scheme);
    const camera = useRef<Mapbox.Camera>(null);
    const reducedMotion = useReducedMotion();
    const online = useMapConnection();
    // Si el estilo no carga se usa uno local; se reintenta al volver la red (como spec 010, CA-15, CA-16).
    const [styleFailed, setStyleFailed] = useState(false);
    useEffect(() => {
        if (online) setStyleFailed(false);
    }, [online]);

    // 3D solo con el estilo de Mapbox: con el estilo local no hay relieve que mostrar (spec 015,
    // CA-16; como la grabación, spec 010).
    const is3D = view === "3D" && !styleFailed;
    useEffect(() => {
        onReliefAvailable?.(!styleFailed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [styleFailed]);
    const pitch = is3D ? PITCH_3D : 0;
    const pitchRef = useRef(pitch);
    pitchRef.current = pitch;

    // Un encuadre pedido antes de que el mapa cargue o tenga tamaño se guarda y se aplica después.
    // Una vez, al abrir Explorar, el primer encuadre no quedó en los 25 km (T24, P-B); no se pudo
    // repetir, y esta es la causa más probable.
    const cargado = useRef(false);
    const conTamano = useRef(false);
    const pendiente = useRef<{ bounds: Bounds; padding: number } | null>(null);
    // Encuadre con la inclinación de la vista: fitBounds deja la cámara sin inclinar, así que se
    // pide todo junto con setCamera (plan, "Riesgos"). La inclinación se lee de una referencia
    // porque el handle se crea una vez.
    // Cuándo se pidió el último encuadre, para ignorar el reposo de la vista anterior (lib/map/idle).
    const encuadreEn = useRef<number | null>(null);
    const aplicar = (bounds: Bounds, padding: number) => {
        encuadreEn.current = Date.now();
        camera.current?.setCamera({
            bounds: { ne: bounds.ne, sw: bounds.sw },
            padding: { paddingTop: padding, paddingBottom: padding, paddingLeft: padding, paddingRight: padding },
            pitch: pitchRef.current,
            animationDuration: reducedMotion ? 0 : CAMERA_MOVE_MS,
        });
    };
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

    // Al cambiar de vista solo cambia la inclinación: el centro y el acercamiento se quedan, así que
    // la zona, las rutas y la selección siguen donde estaban (CA-12).
    const primeraVista = useRef(true);
    useEffect(() => {
        if (primeraVista.current) {
            primeraVista.current = false;
            return;
        }
        if (cargado.current) camera.current?.setCamera({ pitch, animationDuration: reducedMotion ? 0 : CAMERA_MOVE_MS });
    }, [pitch, reducedMotion]);

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
                    // Un reposo durante la animación del encuadre es de la vista anterior: no cuenta
                    // como un movimiento del usuario (spec 006, CA-9; spec 015, T18).
                    if (esReposoViejo(Date.now(), encuadreEn.current, reducedMotion ? 0 : CAMERA_MOVE_MS)) return;
                    const [longitude, latitude] = state.properties.center as LngLat;
                    onCenterChanged?.({ latitude, longitude });
                }}
                onPress={onPress ? () => onPress() : undefined}
            >
                <Mapbox.Camera
                    ref={camera}
                    defaultSettings={{ bounds: { ne: initialBounds.ne, sw: initialBounds.sw }, pitch }}
                />
                {/* Relieve en 3D, como la grabación (spec 010; spec 015, CA-14). Va antes de las capas
                    de la pantalla, así que las rutas quedan encima y siguen el terreno. En 2D, sin
                    sombreado: se ve borroso y con rayas (spec 010, T11). */}
                {!styleFailed && <Mapbox.RasterDemSource id="relieve" url={TERRAIN_URL} tileSize={514} />}
                {is3D && <Mapbox.Terrain sourceID="relieve" style={{ exaggeration: TERRAIN_EXAGGERATION }} />}
                {is3D && hillshade && <Mapbox.HillshadeLayer id="sombreado" sourceID="relieve" style={hillshade} />}
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
