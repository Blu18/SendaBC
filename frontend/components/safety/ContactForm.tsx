import { View, StyleSheet } from "react-native";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import TextBtn from "../ui/buttons/TextBtn";
import TextField from "../ui/TextField";
import { MAX_NOMBRE_CONTACTO } from "../../lib/safety/contacts";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

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
// RouteForm, sin maxLength: el mensaje aparece junto al campo al guardar (CA-2) y el contador de
// la ayuda avisa antes.
export default function ContactForm({ value, onChange, error, submitText, submitting, onSubmit, onCancel }: Props) {
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.form}>
            <TextField
                label="Nombre"
                value={value}
                onChangeText={onChange}
                error={error}
                helper={`Así lo verás en la app y en los avisos · ${value.trim().length}/${MAX_NOMBRE_CONTACTO}`}
                placeholder="Por ejemplo, Mamá"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                accessibilityLabel="Nombre del contacto"
            />
            <View style={styles.actions}>
                <TextBtn text="Cancelar" style={styles.cancel} onPress={onCancel} />
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

const makeStyles = (t: Theme) => StyleSheet.create({
    form: {
        gap: t.spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.sm,
    },
    cancel: {
        flex: 1,
    },
    submit: {
        flex: 1,
    },
});
