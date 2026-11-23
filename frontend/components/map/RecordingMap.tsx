import { useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Mapbox from "@rnmapbox/maps";
import Appear from "../ui/Appear";
import IconButton from "../ui/IconButton";
import Notice from "../ui/Notice";
import MapViewToggle, { type MapViewMode } from "./MapViewToggle";
import { useActivityMap } from "../../hooks/activity/activityMap.hook";
import { useMapConnection } from "../../hooks/map/useMapConnection";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import { CAMERA_MOVE_MS, LOOK_AHEAD_PADDING, PITCH_3D, TERRAIN_EXAGGERATION, ZOOM_FOLLOWING, ZOOM_OVERVIEW } from "../../lib/map/camera";
import { MAP_OFFLINE, MAP_UNAVAILABLE, MAP_WAITING_GPS } from "../../lib/map/messages";
import { TERRAIN_URL, localMapStyle, mapStyle } from "../../lib/map/style";
import { BAJA_CALIFORNIA_CENTER } from "../../lib/routes/constants";
import type { Theme } from "../../lib/theme";

const ICONS = {
    "position-arrow": { image: require("../../assets/map/position-arrow.png"), sdf: true },
    "position-disc": { image: require("../../assets/map/position-disc.png"), sdf: true },
};

// Detrás de una loma, el relieve ocultaría la posición y el trazo: se siguen dibujando (T9).
const MARKER_STYLE = {
    iconAllowOverlap: true,
    iconIgnorePlacement: true,
    iconOcclusionOpacity: 1,
} as const;
const TRACK_OCCLUSION_OPACITY = 0.6;

// Sin estas dos propiedades, los gestos no llegaron a onCameraChanged en el emulador (T12).
const GESTURE_QUIET_MS = 200;
const noop = () => {};

type Props = {
    activityLocalId: number | null;
    // Se muestra arriba del mapa, sobre los controles: la alerta activa (T1).
    overlay?: ReactNode;
};

// Mapa con relieve de la grabación (spec 010, CA-1 a CA-4). Solo muestra lo que ya guardó la
// grabación: no usa la ubicación del SDK, para no abrir otra escucha del GPS (RN-1).
export default function RecordingMap({ activityLocalId, overlay }: Props) {
    const { colors, scheme } = useTheme();
    const { styleURL, hillshade } = mapStyle(scheme);
    const { track, position, heading } = useActivityMap(activityLocalId, true);
    const camera = useRef<Mapbox.Camera>(null);
    const styles = useThemedStyles(makeStyles);
    // Cada actividad monta este componente, así que siempre empieza en 3D (CA-12).
    const [view, setView] = useState<MapViewMode>("3D");
    const online = useMapConnection();
    // Si el estilo no carga se usa uno local, para seguir viendo el trazo (CA-15). Se reintenta al
    // volver la red (CA-16).
    const [styleFailed, setStyleFailed] = useState(false);
    useEffect(() => {
        if (online) setStyleFailed(false);
    }, [online]);
    const is3D = view === "3D" && !styleFailed;
    // Un gesto apaga el seguimiento hasta tocar "Volver a mi posición" (CA-13, CA-14).
    const [following, setFollowing] = useState(true);
    // Con la opción de reducir animaciones, la cámara se mueve sin transición (CA-27).
    const cameraMoveMs = useReducedMotion() ? 0 : CAMERA_MOVE_MS;

    useEffect(() => {
        if (!position || !following) return;
        camera.current?.setCamera({
            centerCoordinate: position,
            heading: heading ?? 0,
            pitch: is3D ? PITCH_3D : 0,
            zoomLevel: ZOOM_FOLLOWING,
            padding: LOOK_AHEAD_PADDING,
            animationDuration: cameraMoveMs,
            animationMode: "easeTo",
        });
    }, [position, heading, is3D, following, cameraMoveMs]);

    // Sin seguimiento solo cambia la inclinación: no se mueve lo que el usuario está mirando (CA-10).
    useEffect(() => {
        if (!following) camera.current?.setCamera({ pitch: is3D ? PITCH_3D : 0, animationDuration: cameraMoveMs });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [is3D]);

    return (
        <View style={styles.map}>
            {/* "Sin mapa" desmonta el mapa y deja los botones, para medir la batería (spec 011, CA-8, RN-7). */}
            {view === "none" ? (
                <View style={[styles.map, styles.noMap]} />
            ) : (
                <View style={styles.map} accessible accessibilityRole="image" accessibilityLabel="Mapa de tu recorrido">
                    <Mapbox.MapView
                        style={styles.map}
                        {...(styleFailed ? { styleJSON: localMapStyle(colors.background) } : { styleURL })}
                        scaleBarEnabled={false}
                        onMapLoadingError={(error) => {
                            if (error?.type === "style") setStyleFailed(true);
                        }}
                    >
                        <Mapbox.CameraGestureObserver
                            quietPeriodMs={GESTURE_QUIET_MS}
                            onMapSteady={noop}
                            onCameraChanged={(event) => {
                                if (event.nativeEvent.properties.isUserInteraction) setFollowing(false);
                            }}
                        />
                        {/* Al volver de "Sin mapa" el mapa se monta de nuevo: empieza en la posición. */}
                        <Mapbox.Camera
                            ref={camera}
                            defaultSettings={
                                position
                                    ? {
                                          centerCoordinate: position,
                                          heading: heading ?? 0,
                                          pitch: is3D ? PITCH_3D : 0,
                                          zoomLevel: ZOOM_FOLLOWING,
                                          padding: LOOK_AHEAD_PADDING,
                                      }
                                    : {
                                          centerCoordinate: BAJA_CALIFORNIA_CENTER,
                                          zoomLevel: ZOOM_OVERVIEW,
                                      }
                            }
                        />
                        <Mapbox.Images images={ICONS} />
                        {!styleFailed && <Mapbox.RasterDemSource id="relieve" url={TERRAIN_URL} tileSize={514} />}
                        {is3D && <Mapbox.Terrain sourceID="relieve" style={{ exaggeration: TERRAIN_EXAGGERATION }} />}
                        {/* En 2D el sombreado se ve borroso y con rayas (T11). */}
                        {is3D && hillshade && <Mapbox.HillshadeLayer id="sombreado" sourceID="relieve" style={hillshade} />}
                        <Mapbox.ShapeSource id="trazo" shape={track}>
                            <Mapbox.LineLayer
                                id="trazo-borde"
                                style={{ lineColor: colors.surface, lineWidth: 8, lineCap: "round", lineJoin: "round", lineOcclusionOpacity: TRACK_OCCLUSION_OPACITY }}
                            />
                            <Mapbox.LineLayer
                                id="trazo-linea"
                                style={{ lineColor: colors.data, lineWidth: 5, lineCap: "round", lineJoin: "round", lineOcclusionOpacity: TRACK_OCCLUSION_OPACITY }}
                            />
                        </Mapbox.ShapeSource>
                        {position && (
                            <Mapbox.ShapeSource
                                id="posicion"
                                shape={{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: position } }}
                            >
                                <Mapbox.SymbolLayer
                                    id="posicion-borde"
                                    style={{ ...MARKER_STYLE, iconImage: "position-disc", iconSize: 0.55, iconColor: colors.surface }}
                                />
                                <Mapbox.SymbolLayer
                                    id="posicion-fondo"
                                    style={{ ...MARKER_STYLE, iconImage: "position-disc", iconSize: 0.45, iconColor: colors.data }}
                                />
                                <Mapbox.SymbolLayer
                                    id="posicion-rumbo"
                                    style={{
                                        ...MARKER_STYLE,
                                        iconImage: "position-arrow",
                                        iconSize: 0.3,
                                        iconColor: colors.onPrimary,
                                        iconRotate: heading ?? 0,
                                        iconRotationAlignment: "map",
                                        iconPitchAlignment: "map",
                                    }}
                                />
                            </Mapbox.ShapeSource>
                        )}
                    </Mapbox.MapView>
                </View>
            )}
            <View style={styles.top} pointerEvents="box-none">
                <Appear>{overlay}</Appear>
                <Appear>{!online && <Notice type="offline" {...MAP_OFFLINE} />}</Appear>
                <Appear>{online && styleFailed && <Notice {...MAP_UNAVAILABLE} />}</Appear>
                {position && !styleFailed && (
                    <View style={styles.controls} pointerEvents="box-none">
                        <MapViewToggle view={view} onChange={setView} />
                        {!following && (
                            <IconButton
                                icon="crosshairs-gps"
                                accessibilityLabel="Volver a mi posición"
                                onPress={() => setFollowing(true)}
                                style={styles.control}
                            />
                        )}
                    </View>
                )}
            </View>
            <Appear style={styles.bottomNotice}>{!position && <Notice {...MAP_WAITING_GPS} />}</Appear>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    map: {
        flex: 1,
    },
    noMap: {
        backgroundColor: t.colors.background,
    },
    control: {
        backgroundColor: t.colors.surface,
        overflow: "visible",
        ...t.shadows.medium,
    },
    top: {
        position: "absolute",
        top: t.spacing.md,
        left: t.spacing.lg,
        right: t.spacing.lg,
        gap: t.spacing.md,
    },
    controls: {
        alignSelf: "flex-end",
        gap: t.spacing.md,
    },
    // Por encima de los botones flotantes (spec 011, CA-36) y del logo de Mapbox, que sus términos
    // piden conservar visible.
    bottomNotice: {
        position: "absolute",
        left: t.spacing.lg,
        right: t.spacing.lg,
        bottom: t.spacing.md + t.touchMin + t.spacing.sm,
    },
});
