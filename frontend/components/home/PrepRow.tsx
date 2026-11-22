import { StyleSheet, Text, View } from "react-native";
import Icon, { type IconName } from "../ui/Icon";
import PressableScale from "../ui/PressableScale";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import { fontFamilies, type ColorTokens, type Theme } from "../../lib/theme";

type Props = {
    icon: IconName;
    iconColor: keyof ColorTokens;
    title: string;
    description: string;
    // Con onPress la fila es tocable y lleva chevron.
    onPress?: () => void;
    divider?: boolean;
};

// Fila de "Listo para salir" en Inicio (spec 013, CA-19, CA-20; Figma "Fila de preparación").
export default function PrepRow({ icon, iconColor, title, description, onPress, divider = false }: Props) {
    const styles = useThemedStyles(makeStyles);
    const contenido = (
        <>
            <Icon name={icon} color={iconColor} decorative />
            <View style={styles.texts}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            {onPress && <Icon name="chevron-right" size={20} color="textMuted" decorative />}
        </>
    );

    if (!onPress) {
        return (
            <View style={[styles.row, divider && styles.divider]} accessible accessibilityLabel={`${title}. ${description}`}>
                {contenido}
            </View>
        );
    }
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${description}`}
            style={[styles.row, divider && styles.divider]}
            pressedStyle={styles.pressed}
        >
            {contenido}
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
    texts: {
        flex: 1,
    },
    title: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    description: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
});
