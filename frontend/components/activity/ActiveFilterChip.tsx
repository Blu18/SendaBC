import { StyleSheet, Text } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import Icon from "../ui/Icon";
import PressableScale from "../ui/PressableScale";

type Props = {
    label: string;
    onRemove: () => void;
};

// "Chip de filtro activo" de Figma (spec 015, CA-7): un filtro aplicado en Mis actividades, en
// primary con onPrimary, como un chip seleccionado. Tocarlo quita ese filtro.
export default function ActiveFilterChip({ label, onRemove }: Props) {
    const styles = useThemedStyles(makeStyles);
    return (
        <PressableScale
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Quitar filtro: ${label}`}
            style={styles.chip}
            pressedStyle={styles.pressed}
        >
            <Text style={styles.label}>{label}</Text>
            <Icon name="close" size={18} color="onPrimary" decorative />
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    chip: {
        minHeight: t.touchMin,
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs,
        paddingLeft: t.spacing.lg,
        paddingRight: t.spacing.md,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.primary,
        overflow: "hidden",
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.text,
        opacity: 0.16,
    },
    label: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.onPrimary,
        flexShrink: 1,
    },
});
