import { View, Text, StyleSheet } from "react-native";
import Chip from "../ui/Chip";
import { useInactivitySettings } from "../../hooks/safety/useInactivitySettings";
import { OPCIONES_QUIETO_MIN, OPCIONES_RESPUESTA_MIN } from "../../lib/safety/thresholds";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// Umbrales de inactividad en la pestaña Seguridad (spec 011, CA-50, RN-9): tiempo sin moverse y
// cuenta regresiva. Se guarda al tocar, sin red, y se usa desde la siguiente actividad (CA-51).
// La distancia de 30 m no se elige: el GPS no da para menos.
export default function InactivitySettings() {
    const { eleccion, cargada, cambiar } = useInactivitySettings();
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.section}>
            <Text style={styles.subtitle} accessibilityRole="header">Si dejo de moverme</Text>
            <Text style={styles.explanation}>
                Si no te mueves más de 30 m en este tiempo, te preguntamos si estás bien. Si no respondes antes de que
                termine la cuenta regresiva, avisamos a tus contactos. Los cambios se usan desde tu siguiente actividad.
            </Text>

            <Text style={styles.label} nativeID="quieto">Tiempo sin moverme</Text>
            <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabelledBy="quieto">
                {OPCIONES_QUIETO_MIN.map((min) => (
                    <Chip
                        key={min}
                        text={`${min} min`}
                        selected={eleccion.quietoMin === min}
                        disabled={!cargada}
                        onPress={() => cambiar({ quietoMin: min })}
                    />
                ))}
            </View>

            <Text style={styles.label} nativeID="respuesta">Cuenta regresiva</Text>
            <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabelledBy="respuesta">
                {OPCIONES_RESPUESTA_MIN.map((min) => (
                    <Chip
                        key={min}
                        text={`${min} min`}
                        selected={eleccion.respuestaMin === min}
                        disabled={!cargada}
                        onPress={() => cambiar({ respuestaMin: min })}
                    />
                ))}
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    section: {
        gap: t.spacing.md,
    },
    subtitle: {
        ...t.typography.title,
        color: t.colors.text,
    },
    explanation: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    label: {
        ...t.typography.body,
        color: t.colors.text,
    },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: t.spacing.sm,
    },
});
