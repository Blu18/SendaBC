import { StyleSheet, Text } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { BATTERY_TEST, etiquetaDeVista, siguienteVista, type MapViewMode } from "../../lib/map/viewMode";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import PressableScale from "../ui/PressableScale";

export type { MapViewMode };

type Props = {
    view: MapViewMode;
    onChange: (view: MapViewMode) => void;
};

// "Botón de vista" de Figma: muestra la vista a la que se cambia (spec 010, CA-10, RN-8). En la
// prueba de batería agrega "Sin mapa" (spec 011, CA-8, RN-7).
export default function MapViewToggle({ view, onChange }: Props) {
    const styles = useThemedStyles(makeStyles);
    const next = siguienteVista(view, BATTERY_TEST);
    const label = etiquetaDeVista(next);
    return (
        <PressableScale
            onPress={() => onChange(next)}
            accessibilityRole="button"
            accessibilityLabel={next === "none" ? "Quitar el mapa" : `Cambiar el mapa a ${label}`}
            style={styles.btn}
            pressedStyle={styles.pressed}
        >
            <Text style={next === "none" ? styles.small : styles.label}>{label}</Text>
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
        backgroundColor: t.colors.surface,
        ...t.shadows.medium,
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
    // Solo en la prueba de batería: dos renglones caben en el círculo.
    small: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
        textAlign: "center",
    },
});
