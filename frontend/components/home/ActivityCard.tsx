import { StyleSheet, Text, View } from "react-native";
import PressableScale from "../ui/PressableScale";
import TrackThumbnail from "../map/TrackThumbnail";
import type { HomeActivity } from "../../hooks/home/useHomeActivities";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import { activityCardText } from "../../lib/home/cards";
import { fontFamilies, type Theme } from "../../lib/theme";

const MINIATURA = 88;

// Actividad reciente en Inicio (spec 013, CA-3, CA-4; Figma "Tarjeta de actividad reciente"):
// miniatura del recorrido, tipo, fecha, distancia y duración. Al tocarla se abre su resumen.
export default function ActivityCard({ activity, onPress }: { activity: HomeActivity; onPress: () => void }) {
    const styles = useThemedStyles(makeStyles);
    const t = activityCardText(activity);
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityHint="Abre el resumen de la actividad"
            style={styles.card}
            pressedStyle={styles.pressed}
        >
            <TrackThumbnail path={activity.path} width={MINIATURA} height={MINIATURA} accessibilityLabel={t.thumbnailLabel} />
            <View style={styles.texts}>
                <Text style={styles.type}>{t.type}</Text>
                <Text style={styles.date}>{t.date}</Text>
                <Text style={styles.metrics}>{t.metrics}</Text>
            </View>
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.md,
        padding: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface,
        overflow: "hidden",
    },
    texts: {
        flex: 1,
        gap: t.spacing.xxs,
    },
    type: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    date: {
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
