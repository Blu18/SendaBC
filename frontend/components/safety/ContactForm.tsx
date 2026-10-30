import { View, Text, TextInput, StyleSheet } from "react-native";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import TextBtn from "../ui/buttons/TextBtn";
import { MAX_NOMBRE_CONTACTO } from "../../lib/safety/contacts";
import { colors } from "../../lib/theme/colors";

type Props = {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    submitText: string;
    submitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};

// Nombre de un contacto de emergencia, al agregarlo o editarlo (spec 008, CA-1 a CA-3). Como en
// RouteForm, sin maxLength: el mensaje aparece junto al campo al guardar (CA-2) y el contador
// avisa antes.
export default function ContactForm({ value, onChange, error, submitText, submitting, onSubmit, onCancel }: Props) {
    const largo = value.trim().length;
    return (
        <View style={styles.form}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>Nombre</Text>
                <Text style={[styles.counter, largo > MAX_NOMBRE_CONTACTO && styles.counterOver]}>
                    {largo}/{MAX_NOMBRE_CONTACTO}
                </Text>
            </View>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder="Por ejemplo, Mamá"
                placeholderTextColor={colors.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                style={[styles.input, !!error && styles.inputError]}
                accessibilityLabel="Nombre del contacto"
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}
            <View style={styles.actions}>
                <TextBtn text="Cancelar" onPress={onCancel} />
                <PrimaryButton
                    text={submitting ? 'Guardando…' : submitText}
                    disabled={submitting}
                    style={styles.submit}
                    onPress={onSubmit}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    form: {
        gap: 6,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    counter: {
        fontSize: 12,
        color: colors.textMuted,
        fontVariant: ['tabular-nums'],
    },
    counterOver: {
        color: colors.error,
    },
    input: {
        color: colors.textMuted,
        fontSize: 16,
        borderRadius: 8,
        borderColor: colors.primary,
        borderWidth: 1.5,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        color: colors.error,
        fontSize: 13,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    submit: {
        flex: 1,
        paddingVertical: 10,
    },
});
