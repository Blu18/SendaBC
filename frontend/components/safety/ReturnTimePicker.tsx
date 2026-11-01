import { View, Text, StyleSheet } from "react-native";
import Chip from "../ui/Chip";
import Icon from "../ui/Icon";
import { SAFETY_MESSAGES, textoRegreso } from "../../lib/safety/messages";
import {
    ajustarRegreso,
    DURACIONES_HORAS,
    regresoDentroDe,
    textoAviso,
} from "../../lib/safety/returnTime";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    value: number | null; // ms, o null sin hora de regreso
    onChange: (regreso: number | null) => void;
    error?: string | null;
};

// Hora de regreso opcional (spec 008, CA-8, RN-10): botones de duración y ajustes de ±15 min,
// sin librería de selector de fecha (plan D9). Diseño de Figma (spec 009): bloque surface con la
// hora en data y Chip de 48 dp.
export default function ReturnTimePicker({ value, onChange, error }: Props) {
    const styles = useThemedStyles(makeStyles);
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
            {error ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                    <Icon name="alert-circle-outline" size={16} color="error" decorative />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
    },
    title: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    value: {
        ...t.typography.title,
        fontFamily: fontFamilies.bold,
        color: t.colors.data,
    },
    hint: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: t.spacing.sm,
    },
    error: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xs,
    },
    errorText: {
        ...t.typography.bodySmall,
        flex: 1,
        color: t.colors.error,
    },
});
