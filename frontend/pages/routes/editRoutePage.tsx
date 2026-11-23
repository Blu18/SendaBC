import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import BottomBar from "../../components/ui/BottomBar";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import RouteForm from "../../components/routes/RouteForm";
import { useRouteDetail } from "../../hooks/routes/useRouteDetail";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { DETAIL_MESSAGES } from "../../lib/routes/format";
import { hayCambios, validarRuta, type RouteFormErrors, type RouteFormValues } from "../../lib/routes/publish";
import { useConfirmDiscard } from "../../hooks/routes/useConfirmDiscard";
import { erroresDeCampo, mensajeDeFallo } from "../../lib/routes/status";
import type { Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import KeyboardScreen from "../../components/ui/KeyboardScreen";

type Props = StaticScreenProps<{ id: string }>;

// Editar el nombre, la descripción y la zona de una ruta propia, con las mismas validaciones que
// al publicar (spec 007, CA-22, CA-5). Tipo, dificultad, distancia, elevación y recorrido no se
// editan (RN-1). Lo escrito se conserva si falla.
export default function EditRoutePage({ route: navRoute }: Props) {
    const { id } = navRoute.params;
    const navigation = useNavigation();
    // Editar necesita conexión: nunca con los datos guardados (spec 011, CA-58).
    const { route, status, retry } = useRouteDetail(id, { usarGuardado: false });
    const { update } = useRouteMutations();
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const header = <ScreenHeader title="Editar ruta" onBack={() => navigation.goBack()} />;

    const [values, setValues] = useState<RouteFormValues | null>(null);
    const [fieldErrors, setFieldErrors] = useState<RouteFormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    // El formulario se llena una sola vez: un refresco del detalle no borra lo que se escribió.
    const llenado = useRef(false);
    // Lo que tenía la ruta al abrir, para saber si hay cambios sin guardar (spec 007, RN-12).
    const [original, setOriginal] = useState<RouteFormValues | null>(null);
    useConfirmDiscard(
        !!values && !!original && hayCambios(values, original) && !update.isSuccess && !update.isPending
    );

    useEffect(() => {
        if (!route || llenado.current) return;
        llenado.current = true;
        const inicial = {
            name: route.name,
            description: route.description ?? '',
            region: route.region ?? '',
        };
        setValues(inicial);
        setOriginal(inicial);
    }, [route]);

    if (!values) {
        if (status === 'loading' || status === 'success') {
            return (
                <View style={styles.container}>
                    {header}
                    <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
                </View>
            );
        }
        const aviso =
            status === 'offline'
                ? { type: 'offline' as const, title: 'Sin conexión', description: DETAIL_MESSAGES.offline }
                : status === 'unavailable'
                  ? { type: 'error' as const, title: 'Ruta no disponible', description: DETAIL_MESSAGES.unavailable }
                  : { type: 'error' as const, title: 'No se pudo cargar', description: DETAIL_MESSAGES.error };
        return (
            <View style={styles.container}>
                {header}
                <View style={styles.noticeArea}>
                    <Appear>
                        <Notice {...aviso} />
                    </Appear>
                </View>
                <BottomBar>
                    {status === 'unavailable' ? (
                        <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
                    ) : (
                        <PrimaryButton text="Reintentar" onPress={retry} />
                    )}
                </BottomBar>
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
        <KeyboardScreen style={styles.container}>
            {header}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Appear>
                    {!!serverError && (
                        <Notice type="error" title="No se pudieron guardar los cambios" description={serverError} />
                    )}
                </Appear>
                <RouteForm values={values} onChange={setValues} errors={fieldErrors} />
                <Text style={styles.nota}>
                    El tipo, la dificultad, la distancia, la elevación y el recorrido salen de la actividad y
                    no se pueden cambiar.
                </Text>
            </ScrollView>
            <BottomBar>
                <PrimaryButton
                    text={update.isPending ? 'Guardando...' : 'Guardar cambios'}
                    onPress={guardar}
                    disabled={update.isPending}
                />
            </BottomBar>
        </KeyboardScreen>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    loading: {
        marginTop: t.spacing.xxl,
    },
    noticeArea: {
        flex: 1,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    content: {
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    nota: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
});
