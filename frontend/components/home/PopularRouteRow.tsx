import { StyleSheet, Text, View } from "react-native";
import Icon from "../ui/Icon";
import PressableScale from "../ui/PressableScale";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import { popularRouteText } from "../../lib/home/cards";
import type { PopularRoute } from "../../lib/routes/api";
import { fontFamilies, type Theme } from "../../lib/theme";

type Props = {
    route: PopularRoute;
    position: number; // 1 a 5
    // Línea arriba para separarla de la anterior en la lista.
    divider?: boolean;
    onPress: () => void;
};

// Ruta popular en Inicio (spec 013, CA-13, CA-16; Figma "Fila de ruta popular"): posición,
// nombre, zona, tipo, distancia y cuántas personas la tienen en favoritas, nunca quiénes (RN-8).
// Al tocarla se abre su detalle.
export default function PopularRouteRow({ route, position, divider = false, onPress }: Props) {
    const styles = useThemedStyles(makeStyles);
    const t = popularRouteText(route, position);
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityHint="Abre el detalle de la ruta"
            style={[styles.row, divider && styles.divider]}
            pressedStyle={styles.pressed}
        >
            <Text style={styles.rank}>{t.rank}</Text>
            <View style={styles.texts}>
                <Text style={styles.name}>
                    {t.name}
                    {t.mine ? <Text style={styles.mine}>  Tuya</Text> : null}
                </Text>
                <Text style={styles.detail}>{t.detail}</Text>
            </View>
            <View style={styles.favorites}>
                <Icon name="heart-outline" size={18} color="secondaryText" decorative />
                <Text style={styles.favoritesText}>{t.favorites}</Text>
            </View>
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.md,
        minHeight: t.touchMin,
        paddingVertical: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        overflow: "hidden",
    },
    divider: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: t.colors.border,
    },
    rank: {
        ...t.typography.title,
        fontFamily: fontFamilies.bold,
        fontVariant: ["tabular-nums"],
        color: t.colors.secondaryText,
        minWidth: 24,
    },
    texts: {
        flex: 1,
        gap: t.spacing.xxs,
    },
    name: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    mine: {
        ...t.typography.caption,
        fontFamily: fontFamilies.bold,
        color: t.colors.primary,
    },
    detail: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    favorites: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs,
    },
    favoritesText: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.secondaryText,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
});
