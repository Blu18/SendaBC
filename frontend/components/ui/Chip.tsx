import { Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import PressableScale from "./PressableScale";

interface ChipProps {
    text: string;
    selected?: boolean;
    disabled?: boolean;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

// Chip de Figma: opción seleccionable (tipo de actividad, hora de regreso) de 48 dp de alto
// (CA-13). Seleccionado: primary con onPrimary y Bold, para no depender solo del color.
export default function Chip({ text, selected = false, disabled, onPress, style }: ChipProps) {
    const styles = useThemedStyles(makeStyles);
    return (
        <PressableScale
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled }}
            style={[styles.chip, selected ? styles.selected : styles.normal, disabled && !selected && styles.disabled, style]}
            pressedStyle={selected ? styles.pressedOnFill : styles.pressed}
        >
            <Text style={selected ? styles.textSelected : styles.text}>{text}</Text>
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    chip: {
        minHeight: t.touchMin,
        // El borde ocupa 1 dp y se descuenta del relleno.
        paddingHorizontal: t.spacing.lg - 1,
        paddingVertical: t.spacing.sm - 1,
        // Seleccionado también lleva borde, del color del relleno: en Android, quitar el borde
        // (1 → 0) al seleccionar dejaba la etiqueta sin dibujar (spec 009, T19).
        borderWidth: 1,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    normal: {
        backgroundColor: t.colors.surface,
        borderColor: t.colors.border,
    },
    selected: {
        backgroundColor: t.colors.primary,
        borderColor: t.colors.primary,
    },
    disabled: {
        opacity: 0.4,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    pressedOnFill: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.text,
        opacity: 0.16,
    },
    text: {
        ...t.typography.body,
        color: t.colors.text,
    },
    textSelected: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.onPrimary,
    },
});
