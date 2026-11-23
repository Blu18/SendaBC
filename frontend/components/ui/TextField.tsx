import { useState, type Ref } from "react";
import { View, Text, TextInput, StyleSheet, StyleProp, ViewStyle, TextInputProps } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import Icon from "./Icon";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
    // React 19 pasa ref como prop: llega al TextInput para mover el foco de un campo al siguiente.
    ref?: Ref<TextInput>;
    label: string;
    // Mensaje de ayuda bajo el campo. Si hay error, se muestra el error en su lugar.
    helper?: string;
    error?: string | null;
    style?: StyleProp<ViewStyle>;
}

// Campo de texto de Figma: etiqueta arriba, campo de 48 dp mínimo y mensaje abajo. El error
// va en color error y con ícono, para no depender solo del color.
export default function TextField({ label, helper, error, style, onFocus, onBlur, ...inputProps }: TextFieldProps) {
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [focused, setFocused] = useState(false);
    const fieldState = error ? styles.fieldError : focused ? styles.fieldFocus : styles.fieldNormal;

    return (
        <View style={[styles.container, style]}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                {...inputProps}
                accessibilityLabel={inputProps.accessibilityLabel ?? label}
                placeholderTextColor={theme.colors.textMuted}
                selectionColor={theme.colors.primary}
                cursorColor={theme.colors.primary}
                onFocus={(e) => {
                    setFocused(true);
                    onFocus?.(e);
                }}
                onBlur={(e) => {
                    setFocused(false);
                    onBlur?.(e);
                }}
                style={[styles.field, fieldState]}
            />
            {error ? (
                <View style={styles.message} accessibilityLiveRegion="polite">
                    <Icon name="alert-circle-outline" size={16} color="error" decorative />
                    <Text style={[styles.messageText, styles.errorText]}>{error}</Text>
                </View>
            ) : helper ? (
                <Text style={styles.messageText}>{helper}</Text>
            ) : null}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        alignSelf: "stretch",
        gap: t.spacing.xs,
    },
    label: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    field: {
        ...t.typography.body,
        color: t.colors.text,
        backgroundColor: t.colors.surface,
        minHeight: t.touchMin,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.md,
    },
    // El borde de 2 dp se descuenta del relleno para que el texto no se mueva al enfocar.
    fieldNormal: {
        borderWidth: 1,
        borderColor: t.colors.border,
        paddingHorizontal: t.spacing.lg,
    },
    fieldFocus: {
        borderWidth: 2,
        borderColor: t.colors.primary,
        paddingHorizontal: t.spacing.lg - 1,
    },
    fieldError: {
        borderWidth: 2,
        borderColor: t.colors.error,
        paddingHorizontal: t.spacing.lg - 1,
    },
    message: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs,
    },
    messageText: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    errorText: {
        color: t.colors.error,
        flexShrink: 1,
    },
});
