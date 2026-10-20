import { View, Text, TextInput, StyleSheet } from "react-native";
import {
    MAX_DESCRIPCION,
    MAX_NOMBRE,
    MAX_ZONA,
    type RouteFormErrors,
    type RouteFormValues,
} from "../../lib/routes/publish";
import { colors } from "../../lib/theme/colors";

type Props = {
    values: RouteFormValues;
    onChange: (values: RouteFormValues) => void;
    errors: RouteFormErrors;
    // Mientras la app deduce la zona del inicio del recorrido (spec 007, RN-7).
    regionPlaceholder?: string;
};

// Sin maxLength: se puede escribir de más y el mensaje aparece junto al campo al publicar
// (CA-5). El contador avisa antes.
function Field(props: {
    label: string;
    value: string;
    max: number;
    error?: string;
    placeholder: string;
    multiline?: boolean;
    onChangeText: (text: string) => void;
}) {
    const largo = props.value.trim().length;
    return (
        <View style={styles.field}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{props.label}</Text>
                <Text style={[styles.counter, largo > props.max && styles.counterOver]}>
                    {largo}/{props.max}
                </Text>
            </View>
            <TextInput
                value={props.value}
                onChangeText={props.onChangeText}
                placeholder={props.placeholder}
                placeholderTextColor={colors.textMuted}
                multiline={props.multiline}
                style={[styles.input, props.multiline && styles.inputMultiline, !!props.error && styles.inputError]}
                accessibilityLabel={props.label}
            />
            {!!props.error && <Text style={styles.errorText}>{props.error}</Text>}
        </View>
    );
}

// Nombre, descripción y zona de una ruta: al publicar (spec 007, CA-4) y al editar (CA-22).
export default function RouteForm({ values, onChange, errors, regionPlaceholder }: Props) {
    return (
        <View style={styles.form}>
            <Field
                label="Nombre"
                value={values.name}
                max={MAX_NOMBRE}
                error={errors.name}
                placeholder="Por ejemplo, Cañón de Doña Petra"
                onChangeText={(name) => onChange({ ...values, name })}
            />
            <Field
                label="Descripción (opcional)"
                value={values.description}
                max={MAX_DESCRIPCION}
                error={errors.description}
                placeholder="Qué esperar: terreno, sombra, agua..."
                multiline
                onChangeText={(description) => onChange({ ...values, description })}
            />
            <Field
                label="Zona (opcional)"
                value={values.region}
                max={MAX_ZONA}
                error={errors.region}
                placeholder={regionPlaceholder ?? "Por ejemplo, Ensenada"}
                onChangeText={(region) => onChange({ ...values, region })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    form: {
        gap: 16,
        alignSelf: 'stretch',
    },
    field: {
        gap: 4,
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
    inputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        color: colors.error,
        fontSize: 13,
    },
});
