import { Pressable, Text, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

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
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: !!disabled }}
            style={[styles.chip, selected ? styles.selected : styles.normal, disabled && !selected && styles.disabled, style]}
        >
            {({ pressed }) => (
                <>
                    {pressed && <View style={selected ? styles.pressedOnFill : styles.pressed} />}
                    <Text style={selected ? styles.textSelected : styles.text}>{text}</Text>
                </>
            )}
        </Pressable>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    chip: {
        minHeight: t.touchMin,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.sm,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    normal: {
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        // El borde ocupa 1 dp: se descuenta del relleno para medir lo mismo que el seleccionado.
        paddingHorizontal: t.spacing.lg - 1,
        paddingVertical: t.spacing.sm - 1,
    },
    selected: {
        backgroundColor: t.colors.primary,
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
