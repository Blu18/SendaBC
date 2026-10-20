import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import * as Location from "expo-location";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import RouteForm from "../../components/routes/RouteForm";
import { useActivitySummary } from "../../hooks/activity/activitySummary.hook";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { getActivityPoints } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { dificultadDe } from "../../lib/routes/difficulty";
import { DIFFICULTY_LABELS } from "../../lib/routes/format";
import {
    motivoNoPublicable,
    validarRuta,
    type RouteFormErrors,
    type RouteFormValues,
} from "../../lib/routes/publish";
import { zonaDe } from "../../lib/routes/region";
import { erroresDeCampo, mensajeDeFallo } from "../../lib/routes/status";
import { colors } from "../../lib/theme/colors";

type Props = StaticScreenProps<{ localId: number }>;

const VACIO: RouteFormValues = { name: '', description: '', region: '' };

// Zona propuesta según dónde empieza el recorrido (RN-7, plan D6). En Android la geocodificación
// pide el permiso de ubicación; publicar no lo solicita (constitución 3.5): sin él, o si el
// servicio no responde, el campo queda vacío y se escribe a mano.
async function zonaPropuesta(localId: number): Promise<string> {
    if (Platform.OS === 'android') {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) return '';
    }
    const [inicio] = await getActivityPoints(localId);
    if (!inicio) return '';
    const direcciones = await Location.reverseGeocodeAsync({
        latitude: inicio.latitude,
        longitude: inicio.longitude,
    });
    return zonaDe(direcciones);
}

function Dato({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.dato}>
            <Text style={styles.datoValue}>{value}</Text>
            <Text style={styles.datoLabel}>{label}</Text>
        </View>
    );
}

// Publicar una actividad como ruta (spec 007, CA-4 a CA-7). Lo escrito vive en el estado de la
// pantalla: si la publicación falla, sigue ahí para volver a intentarlo (CA-7).
export default function PublishRoutePage({ route }: Props) {
    const { localId } = route.params;
    const navigation = useNavigation();
    const { activity, pointCount, loading } = useActivitySummary(localId);
    const { routes: misRutas } = useMyRoutes();
    const { publish } = useRouteMutations();

    const [values, setValues] = useState<RouteFormValues>(VACIO);
    const [fieldErrors, setFieldErrors] = useState<RouteFormErrors>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [buscandoZona, setBuscandoZona] = useState(true);
    // Si el usuario ya escribió la zona, la propuesta que llegue tarde no la reemplaza.
    const zonaEditada = useRef(false);

    useEffect(() => {
        let vigente = true;
        zonaPropuesta(localId)
            .catch((e) => {
                console.log('No se pudo deducir la zona de la ruta:', e);
                return '';
            })
            .then((zona) => {
                if (!vigente) return;
                if (zona && !zonaEditada.current) setValues((v) => ({ ...v, region: zona }));
                setBuscandoZona(false);
            });
        return () => {
            vigente = false;
        };
    }, [localId]);

    const onChange = (nuevos: RouteFormValues) => {
        if (nuevos.region !== values.region) zonaEditada.current = true;
        setValues(nuevos);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.notice}>No se encontró la actividad.</Text>
                <PrimaryButton text="Volver" style={styles.button} onPress={() => navigation.goBack()} />
            </View>
        );
    }

    // La misma revisión que el resumen (CA-1 a CA-3, CA-8); el servidor vuelve a validar. Después
    // de publicar, "Mis rutas" se recarga con la ruta nueva: no se cambia el formulario por el
    // aviso de "ya tiene una ruta" mientras se muestra la confirmación.
    const existente = misRutas.find((r) => r.sourceActivityId === activity.serverId);
    const publicable = motivoNoPublicable(activity, existente);
    if (publicable.kind !== 'publicable' && !publish.isSuccess) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.notice}>
                    {publicable.kind === 'ya-publicada'
                        ? 'Esta actividad ya tiene una ruta publicada.'
                        : publicable.mensaje}
                </Text>
                <PrimaryButton text="Volver" style={styles.button} onPress={() => navigation.goBack()} />
            </View>
        );
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
                    Alert.alert('Ruta publicada', 'Ya aparece en "Explorar rutas" para todos.', [
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
            <Text style={styles.title}>Publicar como ruta</Text>

            <RouteForm
                values={values}
                onChange={onChange}
                errors={fieldErrors}
                regionPlaceholder={buscandoZona ? 'Buscando la zona...' : undefined}
            />

            {/* Datos que salen de la actividad y no se pueden cambiar (RN-1, RN-6) */}
            <View style={styles.datos}>
                <Text style={styles.sectionTitle}>Datos de la actividad</Text>
                <View style={styles.datosRow}>
                    <Dato label="Tipo" value={ACTIVITY_TYPE_LABELS[activity.type]} />
                    <Dato label="Dificultad" value={DIFFICULTY_LABELS[dificultad]} />
                </View>
                <View style={styles.datosRow}>
                    <Dato label="Distancia" value={formatDistance(activity.distanceMeters)} />
                    <Dato label="Elevación ganada" value={formatElevation(activity.elevationGainMeters)} />
                </View>
                <Text style={styles.nota}>
                    La dificultad la calcula la app con la distancia y la elevación.
                </Text>
            </View>

            {/* Aviso de privacidad (CA-4, requisitos no funcionales) */}
            <View style={styles.aviso}>
                <Text style={styles.avisoText}>
                    Se publica el recorrido completo de la actividad ({pointCount}{' '}
                    {pointCount === 1 ? 'punto' : 'puntos'}), incluidos su inicio y su final.
                    Cualquier persona con la app podrá verlo, junto con tu nombre.
                </Text>
            </View>

            {!!serverError && <Text style={styles.serverError}>{serverError}</Text>}
            <PrimaryButton
                text={publish.isPending ? 'Publicando...' : 'Publicar'}
                style={styles.button}
                onPress={publicar}
                disabled={publish.isPending}
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
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    datos: {
        gap: 12,
    },
    datosRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    dato: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    datoValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    datoLabel: {
        fontSize: 13,
        color: colors.textMuted,
    },
    nota: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
    },
    aviso: {
        borderLeftWidth: 4,
        borderLeftColor: colors.secondary,
        paddingLeft: 12,
        paddingVertical: 4,
    },
    avisoText: {
        fontSize: 14,
        color: colors.text,
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
