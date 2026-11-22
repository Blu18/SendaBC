import { StyleSheet, Text, View } from "react-native";
import PressableScale from "../ui/PressableScale";
import TrackThumbnail from "../map/TrackThumbnail";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import { nearbyRouteText } from "../../lib/home/cards";
import type { NearbyRoute } from "../../lib/routes/api";
import { fontFamilies, type Theme } from "../../lib/theme";

export const ROUTE_CARD_WIDTH = 232;
const MINIATURA_ALTO = 112;

// Ruta cercana en el carrusel de Inicio (spec 013, CA-9, CA-16; Figma "Tarjeta de ruta cercana"):
// miniatura del recorrido, nombre, tipo y dificultad, distancia y qué tan lejos está el inicio.
// Al tocarla se abre su detalle. Las propias llevan "Tuya" (spec 006, CA-6).
export default function RouteCard({ route, onPress }: { route: NearbyRoute; onPress: () => void }) {
    const styles = useThemedStyles(makeStyles);
    const t = nearbyRouteText(route);
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityHint="Abre el detalle de la ruta"
            style={styles.card}
            pressedStyle={styles.pressed}
        >
            <TrackThumbnail
                path={route.path}
                width={ROUTE_CARD_WIDTH}
                height={MINIATURA_ALTO}
                lineColor="primary"
                accessibilityLabel={t.thumbnailLabel}
                style={styles.thumbnail}
            />
            <View style={styles.texts}>
                <View style={styles.titleRow}>
                    {/* Sin límite de líneas: con letra grande el nombre crece y no se corta (CA-29). */}
                    <Text style={styles.name}>{t.name}</Text>
                    {t.mine && <Text style={styles.mine}>Tuya</Text>}
                </View>
                <Text style={styles.kind}>{t.kind}</Text>
                <Text style={styles.metrics}>{t.metrics}</Text>
            </View>
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    card: {
        width: ROUTE_CARD_WIDTH,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface,
        overflow: "hidden",
    },
    // La miniatura ocupa el ancho de la tarjeta: sin esquinas propias, las recorta la tarjeta.
    thumbnail: {
        borderRadius: 0,
    },
    texts: {
        padding: t.spacing.md,
        gap: t.spacing.xxs,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: t.spacing.sm,
    },
    name: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
        flex: 1,
    },
    mine: {
        ...t.typography.caption,
        fontFamily: fontFamilies.bold,
        color: t.colors.primary,
    },
    kind: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    metrics: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.data,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
});
