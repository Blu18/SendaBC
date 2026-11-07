import { Text, StyleSheet, StyleProp, ViewStyle, TextStyle, GestureResponderEvent } from "react-native";
import { fontFamilies, type Theme } from "../../../lib/theme";
import { useThemedStyles } from "../../../hooks/theme/useTheme";
import PressableScale from "../PressableScale";

export interface BtnProps {
    text: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    onPress?: (event: GestureResponderEvent) => void;
    disabled?: boolean;
}

export type BtnVariant = "primary" | "secondary" | "text" | "danger";

// Botón de Figma (spec 009, componente "Botón"): 48 dp de alto mínimo (CA-13), capa de
// presionado del 16 % (12 % en secundario y de texto) y opacidad del 40 % al deshabilitarse.
// PrimaryBtn, BgBtn y TextBtn lo envuelven para conservar sus props.
export default function BaseBtn({ variant, ...props }: BtnProps & { variant: BtnVariant }) {
    const styles = useThemedStyles(makeStyles);
    const filled = variant === "primary" || variant === "danger";

    return (
        <PressableScale
            onPress={props.onPress}
            disabled={props.disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!props.disabled }}
            style={[styles.btn, VARIANT_STYLE[variant](styles), props.disabled && styles.disabled, props.style]}
            pressedStyle={filled ? styles.pressedOnFill : styles.pressedOnPrimary}
        >
            <Text style={[styles.label, filled ? styles.labelOnFill : styles.labelPrimary, props.textStyle]}>
                {props.text}
            </Text>
        </PressableScale>
    );
}

type Styles = ReturnType<typeof makeStyles>;

const VARIANT_STYLE: Record<BtnVariant, (s: Styles) => ViewStyle | undefined> = {
    primary: (s) => s.primary,
    secondary: (s) => s.secondary,
    text: () => undefined,
    danger: (s) => s.danger,
};

const makeStyles = (t: Theme) => StyleSheet.create({
    btn: {
        minHeight: t.touchMin,
        minWidth: t.touchMin,
        paddingHorizontal: t.spacing.xl,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.md,
        alignSelf: "stretch",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    primary: {
        backgroundColor: t.colors.primary,
    },
    danger: {
        backgroundColor: t.colors.error,
    },
    secondary: {
        borderWidth: 2,
        borderColor: t.colors.primary,
        // El borde ocupa 2 dp: se descuentan del relleno para medir lo mismo que el primario.
        paddingHorizontal: t.spacing.xl - 2,
        paddingVertical: t.spacing.md - 2,
    },
    disabled: {
        opacity: 0.4,
    },
    pressedOnFill: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.text,
        opacity: 0.16,
    },
    pressedOnPrimary: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    label: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        textAlign: "center",
    },
    labelOnFill: {
        color: t.colors.onPrimary,
    },
    labelPrimary: {
        color: t.colors.primary,
    },
});
