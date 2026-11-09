import { StyleSheet, Text } from "react-native";
import Icon from "../ui/Icon";
import PressableScale from "../ui/PressableScale";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// "Detener actividad" flotando sobre el mapa (spec 011, CA-35). Se ve "Detener" para que sea más
// pequeño, y el lector de pantalla dice el nombre completo.
export default function StopButton({ onPress }: { onPress: () => void }) {
    const styles = useThemedStyles(makeStyles);

    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Detener actividad"
            style={styles.btn}
            pressedStyle={styles.pressed}
        >
            <Icon name="stop" color="onPrimary" decorative />
            <Text style={styles.label}>Detener</Text>
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    btn: {
        minHeight: t.touchMin,
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.sm,
        paddingLeft: t.spacing.lg,
        paddingRight: t.spacing.lg + t.spacing.xs,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.primary,
        ...t.shadows.floating,
    },
    // La misma capa del 16 % que los botones rellenos.
    pressed: {
        ...StyleSheet.absoluteFill,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.text,
        opacity: 0.16,
    },
    label: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.onPrimary,
    },
});
