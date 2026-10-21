import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import RouteForm from "../../components/routes/RouteForm";
import { useRouteDetail } from "../../hooks/routes/useRouteDetail";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { DETAIL_MESSAGES } from "../../lib/routes/format";
import { validarRuta, type RouteFormErrors, type RouteFormValues } from "../../lib/routes/publish";
import { erroresDeCampo, mensajeDeFallo } from "../../lib/routes/status";
import { colors } from "../../lib/theme/colors";

type Props = StaticScreenProps<{ id: string }>;

// Editar el nombre, la descripción y la zona de una ruta propia, con las mismas validaciones que
// al publicar (spec 007, CA-22, CA-5). Tipo, dificultad, distancia, elevación y recorrido no se
// editan (RN-1). Lo escrito se conserva si falla.
export default function EditRoutePage({ route: navRoute }: Props) {
    const { id } = navRoute.params;
    const navigation = useNavigation();
    const { route, status, retry } = useRouteDetail(id);
    const { update } = useRouteMutations();

    const [values, setValues] = useState<RouteFormValues | null>(null);
    const [fieldErrors, setFieldErrors] = useState<RouteFormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    // El formulario se llena una sola vez: un refresco del detalle no borra lo que se escribió.
    const llenado = useRef(false);

    useEffect(() => {
        if (!route || llenado.current) return;
        llenado.current = true;
        setValues({
            name: route.name,
            description: route.description ?? '',
            region: route.region ?? '',
        });
    }, [route]);

    if (!values) {
        if (status === 'loading' || status === 'success') {
            return (
                <View style={[styles.container, styles.centered]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }
        const mensaje =
            status === 'offline'
                ? DETAIL_MESSAGES.offline
                : status === 'unavailable'
                  ? DETAIL_MESSAGES.unavailable
                  : DETAIL_MESSAGES.error;
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.notice}>{mensaje}</Text>
                {status === 'unavailable' ? (
                    <PrimaryButton text="Volver" style={styles.button} onPress={() => navigation.goBack()} />
                ) : (
                    <PrimaryButton text="Reintentar" style={styles.button} onPress={retry} />
                )}
            </View>
        );
    }

    const guardar = () => {
        const errores = validarRuta(values);
        setFieldErrors(errores);
        setServerError(null);
        if (Object.keys(errores).length > 0) return;

        update.mutate(
            {
                id,
                // Vacías, la descripción y la zona se borran en el servidor.
                changes: {
                    name: values.name.trim(),
                    description: values.description.trim(),
                    region: values.region.trim(),
                },
            },
            {
                onSuccess: () => {
                    Alert.alert('Cambios guardados', 'Se ven en el catálogo y en el detalle para todos.', [
                        { text: 'Aceptar', onPress: () => navigation.goBack() },
                    ]);
                },
                onError: (fallo) => {
                    setFieldErrors(erroresDeCampo(fallo));
                    setServerError(mensajeDeFallo(fallo));
                },
            }
        );
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.title}>Editar ruta</Text>
            <RouteForm values={values} onChange={setValues} errors={fieldErrors} />
            <Text style={styles.nota}>
                El tipo, la dificultad, la distancia, la elevación y el recorrido salen de la actividad y
                no se pueden cambiar.
            </Text>
            {!!serverError && <Text style={styles.serverError}>{serverError}</Text>}
            <PrimaryButton
                text={update.isPending ? 'Guardando...' : 'Guardar cambios'}
                style={styles.button}
                onPress={guardar}
                disabled={update.isPending}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centered: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
    },
    content: {
        padding: 24,
        gap: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    nota: {
        fontSize: 13,
        color: colors.textMuted,
    },
    notice: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    },
    serverError: {
        color: colors.error,
        fontSize: 14,
        textAlign: 'center',
    },
    button: {
        paddingVertical: 14,
    },
});
