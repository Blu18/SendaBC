import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

export type MapViewMode = "3D" | "2D";

type Props = {
    view: MapViewMode;
    onChange: (view: MapViewMode) => void;
};

// "Botón de vista" de Figma: muestra la vista a la que se cambia (spec 010, CA-10, RN-8).
export default function MapViewToggle({ view, onChange }: Props) {
    const styles = useThemedStyles(makeStyles);
    const next = view === "3D" ? "2D" : "3D";
    return (
        <Pressable
            onPress={() => onChange(next)}
            accessibilityRole="button"
            accessibilityLabel={`Cambiar el mapa a ${next}`}
            style={styles.btn}
        >
            {({ pressed }) => (
                <>
                    {pressed && <View style={styles.pressed} />}
                    <Text style={styles.label}>{next}</Text>
                </>
            )}
        </Pressable>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    btn: {
        width: t.touchMin,
        height: t.touchMin,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.colors.surface,
        ...t.shadows.floating,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    label: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
});
