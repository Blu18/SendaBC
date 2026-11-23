import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import * as Location from "expo-location";
import BottomBar from "../../components/ui/BottomBar";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import RouteForm from "../../components/routes/RouteForm";
import { useActivitySummary } from "../../hooks/activity/activitySummary.hook";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { getActivityPoints } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { dificultadDe } from "../../lib/routes/difficulty";
import { DIFFICULTY_LABELS } from "../../lib/routes/format";
import { useConfirmDiscard } from "../../hooks/routes/useConfirmDiscard";
import {
    hayCambios,
    inicioDelRecorrido,
    motivoNoPublicable,
    validarRuta,
    type RouteFormErrors,
    type RouteFormValues,
} from "../../lib/routes/publish";
import { zonaDe } from "../../lib/routes/region";
import { erroresDeCampo, mensajeDeFallo } from "../../lib/routes/status";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import KeyboardScreen from "../../components/ui/KeyboardScreen";

type Props = StaticScreenProps<{ localId: number }>;

const VACIO: RouteFormValues = { name: '', description: '', region: '' };

// Zona propuesta según dónde empieza el recorrido (RN-7, plan D6). En Android la geocodificación
// pide el permiso de ubicación; publicar no lo solicita (constitución 3.5): sin él, o si el
// servicio no responde, el campo queda vacío y se escribe a mano.
async function zonaPropuesta(localId: number, startedAt: string): Promise<string> {
    if (Platform.OS === 'android') {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) return '';
    }
    const inicio = inicioDelRecorrido(await getActivityPoints(localId), startedAt);
    if (!inicio) return '';
    const direcciones = await Location.reverseGeocodeAsync({
        latitude: inicio.latitude,
        longitude: inicio.longitude,
    });
    return zonaDe(direcciones);
}

// Publicar una actividad como ruta (spec 007, CA-4 a CA-7). Lo escrito vive en el estado de la
// pantalla: si la publicación falla, sigue ahí para volver a intentarlo (CA-7).
export default function PublishRoutePage({ route }: Props) {
    const { localId } = route.params;
    const navigation = useNavigation();
    const { activity, pointCount, loading } = useActivitySummary(localId);
    const { routes: misRutas } = useMyRoutes();
    const { publish } = useRouteMutations();
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const header = <ScreenHeader title="Publicar como ruta" onBack={() => navigation.goBack()} />;
    // Pantalla sin formulario: un aviso y "Volver" abajo.
    const soloAviso = (aviso: { type: 'error' | 'info'; title: string; description: string }) => (
        <View style={styles.container}>
            {header}
            <View style={styles.noticeArea}>
                <Appear>
                    <Notice {...aviso} />
                </Appear>
            </View>
            <BottomBar>
                <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
            </BottomBar>
        </View>
    );

    const [values, setValues] = useState<RouteFormValues>(VACIO);
    const [fieldErrors, setFieldErrors] = useState<RouteFormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [buscandoZona, setBuscandoZona] = useState(true);
    // Si el usuario ya escribió la zona, la propuesta que llegue tarde no la reemplaza.
    const zonaEditada = useRef(false);
    // Lo que había al abrir: la zona propuesta no cuenta como cambio del usuario (spec 007, RN-12).
    const [zonaSugerida, setZonaSugerida] = useState('');
    useConfirmDiscard(
        hayCambios(values, { ...VACIO, region: zonaEditada.current ? '' : zonaSugerida }) &&
            !publish.isSuccess &&
            !publish.isPending
    );

    const startedAt = activity?.startedAt;
    useEffect(() => {
        if (!startedAt) return;
        let vigente = true;
        zonaPropuesta(localId, startedAt)
            .catch((e) => {
                console.log('No se pudo deducir la zona de la ruta:', e);
                return '';
            })
            .then((zona) => {
                if (!vigente) return;
                if (zona && !zonaEditada.current) {
                    setValues((v) => ({ ...v, region: zona }));
                    setZonaSugerida(zona);
                }
                setBuscandoZona(false);
            });
        return () => {
            vigente = false;
        };
    }, [localId, startedAt]);

    const onChange = (nuevos: RouteFormValues) => {
        if (nuevos.region !== values.region) zonaEditada.current = true;
        setValues(nuevos);
    };

    if (loading) {
        return (
            <View style={styles.container}>
                {header}
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            </View>
        );
    }

    if (!activity) {
        return soloAviso({
            type: 'error',
            title: 'No se encontró la actividad',
            description: 'Puede que se haya borrado de este teléfono.',
        });
    }

    // La misma revisión que el resumen (CA-1 a CA-3, CA-8); el servidor vuelve a validar. Después
    // de publicar, "Mis rutas" se recarga con la ruta nueva: no se cambia el formulario por el
    // aviso de "ya tiene una ruta" mientras se muestra la confirmación.
    const existente = misRutas.find((r) => r.sourceActivityId === activity.serverId);
    const publicable = motivoNoPublicable(activity, existente);
    if (publicable.kind !== 'publicable' && !publish.isSuccess) {
        return soloAviso({
            type: 'info',
            title: 'No se puede publicar',
            description:
                publicable.kind === 'ya-publicada' ? 'Esta actividad ya tiene una ruta publicada.' : publicable.mensaje,
        });
    }

    const distancia = activity.distanceMeters ?? 0;
    const elevacion = activity.elevationGainMeters ?? 0;
    const dificultad = dificultadDe(activity.type, distancia, elevacion);

    const publicar = () => {
        const errores = validarRuta(values);
        setFieldErrors(errores);
        setServerError(null);
        if (Object.keys(errores).length > 0) return;

        publish.mutate(
            {
                activityId: activity.serverId!,
                name: values.name.trim(),
                description: values.description.trim(),
                region: values.region.trim(),
            },
            {
                onSuccess: () => {
                    Alert.alert('Ruta publicada', 'Ya aparece en "Rutas" para todos.', [
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
                    {!!serverError && <Notice type="error" title="No se pudo publicar" description={serverError} />}
                </Appear>

                <RouteForm
                    values={values}
                    onChange={onChange}
                    errors={fieldErrors}
                    regionPlaceholder={buscandoZona ? 'Buscando la zona...' : undefined}
                />

                {/* Datos que salen de la actividad y no se pueden cambiar (RN-1, RN-6) */}
                <View style={styles.datos}>
                    <Text style={styles.datosTitle}>Datos de la actividad</Text>
                    <Text style={styles.datosText}>
                        {ACTIVITY_TYPE_LABELS[activity.type]} · Dificultad {DIFFICULTY_LABELS[dificultad].toLowerCase()}
                    </Text>
                    <Text style={styles.datosData}>
                        {formatDistance(activity.distanceMeters)} · {formatElevation(activity.elevationGainMeters)} de
                        elevación ganada
                    </Text>
                    <Text style={styles.nota}>La dificultad la calcula la app con la distancia y la elevación.</Text>
                </View>

                {/* Aviso de privacidad (CA-4, requisitos no funcionales) */}
                <Appear>
                    <Notice
                        title="Tu recorrido será público"
                        description={`Se publica el recorrido completo de la actividad (${pointCount} ${pointCount === 1 ? 'punto' : 'puntos'}), incluidos su inicio y su final. Cualquier persona con la app podrá verlo, junto con tu nombre.`}
                    />
                </Appear>
            </ScrollView>

            <BottomBar>
                <PrimaryButton
                    text={publish.isPending ? 'Publicando...' : 'Publicar'}
                    onPress={publicar}
                    disabled={publish.isPending}
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
    datos: {
        gap: t.spacing.xs,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
    },
    datosTitle: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    datosText: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    datosData: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.bold,
        color: t.colors.data,
    },
    nota: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
});
