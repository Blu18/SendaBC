import { View, Text, StyleSheet } from "react-native";
import TextBtn from "../ui/buttons/TextBtn";
import { AVISO_911, SAFETY_MESSAGES, textoSeguridadActiva } from "../../lib/safety/messages";
import { colors } from "../../lib/theme/colors";

type Props = {
    // Nombres de los contactos activos; vacío si no hay a quién avisar.
    nombres: string[];
    onConfigurar: () => void;
};

// Estado de la seguridad antes de iniciar (spec 008, CA-8, CA-9): a quiénes se avisaría o, sin
// contactos activos, el aviso con el enlace a configurarlos. Se puede iniciar de todos modos.
export default function SafetyCard({ nombres, onConfigurar }: Props) {
    const activa = nombres.length > 0;
    return (
        <View style={[styles.card, activa ? styles.active : styles.inactive]}>
            <Text style={styles.text}>
                {activa ? textoSeguridadActiva(nombres) : SAFETY_MESSAGES.sinContactos}
            </Text>
            {!activa && <TextBtn text={SAFETY_MESSAGES.configurar} onPress={onConfigurar} />}
            <Text style={styles.disclaimer}>{AVISO_911}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        alignSelf: 'stretch',
        gap: 8,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
    },
    active: {
        borderColor: colors.primary,
    },
    inactive: {
        borderColor: colors.secondary,
    },
    text: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    disclaimer: {
        color: colors.textMuted,
        fontSize: 12,
    },
});
