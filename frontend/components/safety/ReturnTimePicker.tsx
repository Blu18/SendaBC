import { View, Text, Pressable, StyleSheet } from "react-native";
import { SAFETY_MESSAGES, textoRegreso } from "../../lib/safety/messages";
import {
    ajustarRegreso,
    DURACIONES_HORAS,
    regresoDentroDe,
    textoAviso,
} from "../../lib/safety/returnTime";
import { colors } from "../../lib/theme/colors";

type Props = {
    value: number | null; // ms, o null sin hora de regreso
    onChange: (regreso: number | null) => void;
    error?: string | null;
};

// Hora de regreso opcional (spec 008, CA-8, RN-10): botones de duración y ajustes de ±15 min,
// sin librería de selector de fecha (plan D9).
export default function ReturnTimePicker({ value, onChange, error }: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{SAFETY_MESSAGES.regresoTitulo}</Text>
            <Text style={styles.value}>
                {value === null ? SAFETY_MESSAGES.sinRegreso : textoRegreso(value)}
            </Text>
            <Text style={styles.hint}>
                {value === null ? SAFETY_MESSAGES.regresoExplicacion : textoAviso(value)}
            </Text>

            <View style={styles.row}>
                {DURACIONES_HORAS.map((horas) => (
                    <Chip
                        key={horas}
                        text={`${horas} h`}
                        onPress={() => onChange(regresoDentroDe(horas, Date.now()))}
                    />
                ))}
            </View>
            {value !== null && (
                <View style={styles.row}>
                    <Chip text="−15 min" onPress={() => onChange(ajustarRegreso(value, -1, Date.now()))} />
                    <Chip text="+15 min" onPress={() => onChange(ajustarRegreso(value, 1, Date.now()))} />
                    <Chip text={SAFETY_MESSAGES.quitarRegreso} onPress={() => onChange(null)} />
                </View>
            )}
            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
    );
}

function Chip({ text, onPress }: { text: string; onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
            <Text style={styles.chipText}>{text}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        gap: 8,
    },
    title: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    value: {
        color: colors.data,
        fontSize: 20,
        fontWeight: 'bold',
    },
    hint: {
        color: colors.textMuted,
        fontSize: 13,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    chipPressed: {
        opacity: 0.6,
    },
    chipText: {
        color: colors.primary,
        fontWeight: '600',
    },
    error: {
        color: colors.error,
        fontSize: 13,
    },
});
