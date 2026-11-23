import type { ReactNode } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, GestureResponderEvent } from "react-native";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import Icon from "./Icon";
import PressableScale from "./PressableScale";

interface CardProps {
    title?: string;
    description?: string;
    // Contenido propio en lugar de título y descripción (p. ej. la fila de actividad).
    children?: ReactNode;
    // Con onPress toda la tarjeta es tocable y lleva chevron.
    onPress?: (event: GestureResponderEvent) => void;
    accessibilityLabel?: string;
    // Dentro de una GroupedList: sin fondo, radio ni sombra propios; los pone el grupo (spec 014).
    grouped?: boolean;
    style?: StyleProp<ViewStyle>;
}

// Tarjeta de Figma: surface sobre background, radio lg y sombra baja, sin borde (spec 014, RN-13).
export default function Card({ title, description, children, onPress, accessibilityLabel, grouped = false, style }: CardProps) {
    const styles = useThemedStyles(makeStyles);
    const content = (
        <>
            <View style={styles.content}>
                {children ?? (
                    <>
                        {title ? <Text style={styles.title}>{title}</Text> : null}
                        {description ? <Text style={styles.description}>{description}</Text> : null}
                    </>
                )}
            </View>
            {onPress && <Icon name="chevron-right" color="textMuted" decorative />}
        </>
    );

    const cardStyle = [styles.card, !grouped && styles.surface, style];
    if (!onPress) return <View style={cardStyle}>{content}</View>;

    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            style={cardStyle}
            pressedStyle={styles.pressed}
        >
            {content}
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.md,
        padding: t.spacing.lg,
        overflow: "hidden",
    },
    surface: {
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        ...t.shadows.low,
    },
    content: {
        flex: 1,
        gap: t.spacing.xs,
    },
    title: {
        ...t.typography.title,
        color: t.colors.text,
    },
    description: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
});
