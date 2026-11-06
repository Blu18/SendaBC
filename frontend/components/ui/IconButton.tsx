import { StyleSheet, StyleProp, ViewStyle, GestureResponderEvent } from "react-native";
import type { ColorTokens, Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import Icon, { type IconName } from "./Icon";
import PressableScale from "./PressableScale";

interface IconButtonProps {
    icon: IconName;
    // Obligatorio: el botón no lleva texto, así que esto es lo que oye el lector de pantalla.
    accessibilityLabel: string;
    onPress?: (event: GestureResponderEvent) => void;
    color?: keyof ColorTokens;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

// Botón de ícono de Figma: área de toque de 48 × 48 dp (CA-13) con un ícono de 24.
export default function IconButton({ icon, accessibilityLabel, onPress, color = "text", disabled, style }: IconButtonProps) {
    const styles = useThemedStyles(makeStyles);
    return (
        <PressableScale
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: !!disabled }}
            style={[styles.btn, disabled && styles.disabled, style]}
            pressedStyle={styles.pressed}
        >
            <Icon name={icon} color={color} decorative />
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    btn: {
        width: t.touchMin,
        height: t.touchMin,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    disabled: {
        opacity: 0.4,
    },
});
