import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import BgBtn from "../../components/ui/buttons/BgBtn";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import SyncBadge from "../../components/ui/SyncBadge";
import { useActivitySummary } from "../../hooks/activity/activitySummary.hook";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import {
    ACTIVITY_TYPE_LABELS,
    ELEVATION_SOURCE_LABELS,
    formatStartedAt,
    showsSpeed,
    syncStatusOf,
} from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance, formatElevation, formatPace, formatSpeed } from "../../lib/format/metrics";
import { averagePace, averageSpeed } from "../../lib/metrics/summary";
import type { Activity } from "../../lib/db/activities";
import { motivoNoPublicable } from "../../lib/routes/publish";
import { colors } from "../../lib/theme/colors";

// origin 'recording': se llega al detener y "Listo" regresa a la pantalla principal (CA-2).
// origin 'history': se llega desde "Mis actividades" y atrás regresa a la lista (CA-21).
type Props = StaticScreenProps<{ localId: number; origin: 'recording' | 'history' }>;

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <View style={styles.stat}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

// "Publicar como ruta", el motivo por el que no se puede o "Ver ruta publicada" (spec 007,
// CA-1 a CA-3, CA-8). Si la ruta ya existe se sabe por "Mis rutas" (plan D7); mientras carga no
// se ofrece publicar. Sin conexión sí: el formulario avisa y el servidor responde 409 si ya
// tenía ruta.
function PublishSection({ activity, localId }: { activity: Activity; localId: number }) {
    const navigation = useNavigation();
    const { routes, status } = useMyRoutes();

    const existente = routes.find((r) => r.sourceActivityId === activity.serverId);
    const publicable = motivoNoPublicable(activity, existente);
    if (publicable.kind === 'publicable' && status === 'loading') return null;

    switch (publicable.kind) {
        case 'publicable':
            return (
                <PrimaryButton
                    text="Publicar como ruta"
                    style={styles.doneBtn}
                    onPress={() => navigation.navigate('PublishRoute', { localId })}
                />
            );
        case 'ya-publicada':
            // Abre el detalle de la ruta (spec 007, T16).
            return <BgBtn text="Ver ruta publicada" style={styles.doneBtn} />;
        default:
            return <Text style={styles.publishNotice}>{publicable.mensaje}</Text>;
    }
}

// Resumen de una actividad terminada, leído de SQLite (spec 004, CA-1, CA-3, RN-4), con su
// estado de sincronización (spec 005, CA-14, CA-21)
export default function ActivitySummaryPage({ route }: Props) {
    const { localId, origin } = route.params;
    const navigation = useNavigation();
    const { activity, pointCount, loading } = useActivitySummary(localId);

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={styles.container}>
                <Text style={styles.notice}>No se encontró la actividad.</Text>
                <PrimaryButton text="Volver" style={styles.doneBtn} onPress={() => navigation.goBack()} />
            </View>
        );
    }

    const distance = activity.distanceMeters ?? 0;
    const duration = activity.durationSeconds ?? 0;
    // Ritmo o velocidad se derivan al mostrar, no se guardan (CA-5, CA-6, RN-5)
    const speed = showsSpeed(activity.type);
    const average = speed
        ? formatSpeed(averageSpeed(distance, duration))
        : formatPace(averagePace(distance, duration));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{ACTIVITY_TYPE_LABELS[activity.type]}</Text>
                <Text style={styles.subtitle}>{formatStartedAt(activity.startedAt)}</Text>
                <SyncBadge status={syncStatusOf(activity)} style={styles.badge} />
            </View>

            <View style={styles.stats}>
                <Stat value={formatDuration(duration)} label="Duración" />
                <Stat value={formatDistance(activity.distanceMeters)} label="Distancia" />
                <Stat value={average} label={speed ? 'Velocidad promedio' : 'Ritmo promedio'} />
            </View>

            <View style={styles.stats}>
                <Stat value={formatElevation(activity.elevationGainMeters)} label="Elevación ganada" />
                <Stat value={formatElevation(activity.elevationLossMeters)} label="Elevación perdida" />
            </View>

            <View style={styles.details}>
                {activity.elevationSource && (
                    <Text style={styles.detail}>{ELEVATION_SOURCE_LABELS[activity.elevationSource]}</Text>
                )}
                <Text style={styles.detail}>
                    {pointCount} {pointCount === 1 ? 'punto registrado' : 'puntos registrados'}
                </Text>
            </View>

            <PublishSection activity={activity} localId={localId} />

            {origin === 'recording' && (
                <PrimaryButton text="Listo" style={styles.doneBtn} onPress={() => navigation.goBack()} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 24,
        backgroundColor: colors.background,
    },
    header: {
        alignItems: 'center',
        gap: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textMuted,
    },
    badge: {
        alignSelf: 'center',
        marginTop: 4,
    },
    stats: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        justifyContent: 'space-around',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 13,
        color: colors.textMuted,
        textAlign: 'center',
    },
    details: {
        alignItems: 'center',
        gap: 4,
    },
    detail: {
        fontSize: 14,
        color: colors.textMuted,
    },
    notice: {
        fontSize: 16,
        color: colors.text,
    },
    doneBtn: {
        paddingVertical: 14,
    },
    publishNotice: {
        fontSize: 14,
        color: colors.textMuted,
        textAlign: 'center',
    },
});
