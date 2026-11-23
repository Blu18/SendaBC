import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { fontFamilies, type ColorTokens, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import Icon, { type IconName } from "./Icon";
import IconButton from "./IconButton";

export type NoticeType = "info" | "offline" | "error" | "alert";

const NOTICE: Record<NoticeType, { color: keyof ColorTokens; icon: IconName }> = {
    info: { color: "data", icon: "information-variant" },
    offline: { color: "textMuted", icon: "wifi-off" },
    error: { color: "error", icon: "exclamation-thick" },
    alert: { color: "alert", icon: "exclamation-thick" },
};

interface NoticeProps {
    type?: NoticeType;
    title: string;
    description?: string;
    // Con onClose lleva el botón cerrar de 48 dp. "alert" no se cierra: se cancela con "Estoy bien".
    onClose?: () => void;
    style?: StyleProp<ViewStyle>;
}

// Aviso flotante de Figma (vacío, error, sin conexión): surface con un tinte del 10 % del color
// del tipo, ícono en un círculo y título Bold en ese color. "alert" (solo seguridad, RN-5) va
// sobre alert sólido con onAlert, porque alert sobre el tinte no llega a 4.5:1 (RN-4).
export default function Notice({ type = "info", title, description, onClose, style }: NoticeProps) {
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { color, icon } = NOTICE[type];
    const isAlert = type === "alert";
    const closable = !!onClose && !isAlert;

    return (
        <View
            style={[styles.notice, isAlert && styles.alert, closable && styles.closable, style]}
            accessibilityRole={type === "error" || isAlert ? "alert" : "summary"}
            accessibilityLiveRegion={isAlert ? "assertive" : "polite"}
        >
            {!isAlert && <View style={[styles.tint, { backgroundColor: theme.colors[color] }]} />}
            <View style={[styles.iconCircle, { backgroundColor: theme.colors[isAlert ? "onAlert" : color] }]}>
                <Icon name={icon} size={16} color={isAlert ? "alert" : "surface"} decorative />
            </View>
            <View style={styles.texts}>
                <Text style={[styles.title, { color: theme.colors[isAlert ? "onAlert" : type === "offline" ? "text" : color] }]}>
                    {title}
                </Text>
                {description ? (
                    <Text style={[styles.description, isAlert && styles.descriptionOnAlert]}>{description}</Text>
                ) : null}
            </View>
            {closable && (
                <IconButton icon="close" accessibilityLabel="Cerrar aviso" color="textMuted" onPress={onClose} />
            )}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    notice: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: t.spacing.md,
        paddingLeft: t.spacing.lg,
        paddingRight: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.surface,
        ...t.shadows.low,
    },
    // Con cerrar, el botón de 48 dp ya deja aire a la derecha.
    closable: {
        paddingRight: t.spacing.xs,
    },
    alert: {
        backgroundColor: t.colors.alert,
    },
    tint: {
        ...StyleSheet.absoluteFill,
        borderRadius: t.radius.md,
        opacity: 0.1,
    },
    iconCircle: {
        width: 24,
        height: 24,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
    },
    texts: {
        flex: 1,
        gap: t.spacing.xs,
        paddingTop: t.spacing.xxs,
    },
    title: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
    },
    description: {
        ...t.typography.bodySmall,
        color: t.colors.text,
    },
    descriptionOnAlert: {
        color: t.colors.onAlert,
    },
});
