import { View, StyleSheet } from "react-native";
import TextField from "../ui/TextField";
import {
    MAX_DESCRIPCION,
    MAX_NOMBRE,
    MAX_ZONA,
    type RouteFormErrors,
    type RouteFormValues,
} from "../../lib/routes/publish";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    values: RouteFormValues;
    onChange: (values: RouteFormValues) => void;
    errors: RouteFormErrors;
    // Mientras la app deduce la zona del inicio del recorrido (spec 007, RN-7).
    regionPlaceholder?: string;
};

// Sin maxLength: se puede escribir de más y el mensaje aparece junto al campo al publicar
// (CA-5). El contador de la ayuda avisa antes.
const ayuda = (value: string, max: number) => `Hasta ${max} caracteres · ${value.trim().length}/${max}`;

// Nombre, zona y descripción de una ruta: al publicar (spec 007, CA-4) y al editar (CA-22).
export default function RouteForm({ values, onChange, errors, regionPlaceholder }: Props) {
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.form}>
            <TextField
                label="Nombre"
                value={values.name}
                error={errors.name}
                helper={ayuda(values.name, MAX_NOMBRE)}
                placeholder="Por ejemplo, Cañón de Doña Petra"
                onChangeText={(name) => onChange({ ...values, name })}
            />
            <TextField
                label="Zona (opcional)"
                value={values.region}
                error={errors.region}
                helper={ayuda(values.region, MAX_ZONA)}
                placeholder={regionPlaceholder ?? "Por ejemplo, Ensenada"}
                onChangeText={(region) => onChange({ ...values, region })}
            />
            <TextField
                label="Descripción (opcional)"
                value={values.description}
                error={errors.description}
                helper={ayuda(values.description, MAX_DESCRIPCION)}
                placeholder="Qué esperar: terreno, sombra, agua..."
                multiline
                textAlignVertical="top"
                onChangeText={(description) => onChange({ ...values, description })}
            />
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    form: {
        gap: t.spacing.md,
        alignSelf: 'stretch',
    },
});
