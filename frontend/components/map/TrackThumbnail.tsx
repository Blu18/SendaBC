import { useMemo, useState } from "react";
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../../hooks/theme/useTheme";
import { frameThumbnail, staticMapUrl } from "../../lib/map/thumbnail";
import type { LngLat } from "../../lib/map/track";

type Props = {
    // Recorrido en [lng, lat]: los puntos de una actividad o el recorrido de una ruta.
    path: LngLat[];
    width: number;
    height: number;
    // Lo que el lector de pantalla dice de la miniatura, p. ej. "Senderismo, 8.20 km" (CA-28).
    accessibilityLabel: string;
    // Color del trazo: `data` para actividades y `primary` para rutas, como en sus mapas.
    lineColor?: "data" | "primary";
    style?: StyleProp<ViewStyle>;
};

// Mapa en miniatura de un recorrido (spec 013, CA-3, CA-8; plan D3). El fondo es una imagen
// estática de Mapbox pedida solo por área. El recorrido se dibuja encima en el teléfono y no viaja
// a Mapbox. Sin red, o si la imagen no carga, queda el recorrido sobre el fondo liso.
export default function TrackThumbnail({ path, width, height, accessibilityLabel, lineColor = "data", style }: Props) {
    const { colors, scheme, radius } = useTheme();
    const marco = useMemo(() => frameThumbnail(path, width, height), [path, width, height]);
    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
    const url = marco && token ? staticMapUrl({ scheme, center: marco.center, zoom: marco.zoom, width, height, token }) : null;
    // Si la imagen falla (sin red y sin caché) se queda el fondo liso (CA-8).
    const [fallo, setFallo] = useState(false);

    return (
        <View
            style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.surface }, styles.box, style]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}
        >
            {url && !fallo && (
                <Image
                    source={{ uri: url }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    onError={() => setFallo(true)}
                    accessibilityIgnoresInvertColors
                />
            )}
            {marco && (
                <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                    {/* Un borde del color de la superficie para que el trazo se lea sobre cualquier fondo. */}
                    <Path d={marco.svgPath} stroke={colors.surface} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <Path d={marco.svgPath} stroke={colors[lineColor]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        overflow: "hidden",
    },
});
