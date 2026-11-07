import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import BgBtn from "../../components/ui/buttons/BgBtn";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import SyncBadge from "../../components/ui/SyncBadge";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import Metric from "../../components/ui/Metric";
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
import type { Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// origin 'recording': se llega al detener y "Listo" regresa a la pantalla principal (CA-2).
// origin 'history': se llega desde "Mis actividades" y atrás regresa a la lista (CA-21).
type Props = StaticScreenProps<{ localId: number; origin: 'recording' | 'history' }>;

// "Publicar como ruta", el motivo por el que no se puede o "Ver ruta publicada" (spec 007,
// CA-1 a CA-3, CA-8). Si la ruta ya existe se sabe por "Mis rutas" (plan D7); mientras carga no
// se ofrece publicar. Sin conexión sí: el formulario avisa y el servidor responde 409 si ya
// tenía ruta.
function PublishSection({ activity, localId }: { activity: Activity; localId: number }) {
    const navigation = useNavigation();
    const styles = useThemedStyles(makeStyles);
    const { routes, status } = useMyRoutes();

    const existente = routes.find((r) => r.sourceActivityId === activity.serverId);
    const publicable = motivoNoPublicable(activity, existente);
    if (publicable.kind === 'publicable' && status === 'loading') return null;

    switch (publicable.kind) {
        case 'publicable':
            return (
                <BgBtn
                    text="Publicar como ruta"
                    onPress={() => navigation.navigate('PublishRoute', { localId })}
                />
            );
        case 'ya-publicada':
            return (
                <BgBtn
                    text="Ver ruta publicada"
                    onPress={() => navigation.navigate('RouteDetail', { id: publicable.rutaId })}
                />
            );
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
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const header = <ScreenHeader title="Resumen" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <View style={styles.screen}>
                {header}
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={styles.screen}>
                {header}
                <View style={styles.content}>
                    <Appear>
                        <Notice
                            type="error"
                            title="No se encontró la actividad"
                            description="Puede que se haya borrado de este teléfono."
                        />
                    </Appear>
                </View>
                <View style={styles.spacer} />
                <View style={styles.actions}>
                    <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
                </View>
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

    const detalles = [
        activity.elevationSource ? ELEVATION_SOURCE_LABELS[activity.elevationSource] : null,
        `${pointCount} ${pointCount === 1 ? 'punto registrado' : 'puntos registrados'}`,
    ].filter(Boolean).join(' · ');

    return (
        <View style={styles.screen}>
            {header}
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.titles}>
                    <Text style={styles.title} accessibilityRole="header">{ACTIVITY_TYPE_LABELS[activity.type]}</Text>
                    <Text style={styles.subtitle}>{formatStartedAt(activity.startedAt)}</Text>
                    <SyncBadge status={syncStatusOf(activity)} />
                </View>

                <View style={styles.metrics}>
                    <View style={styles.row}>
                        <Metric size="medium" value={formatDuration(duration)} label="Duración" style={styles.flex} />
                        <Metric size="medium" value={formatDistance(activity.distanceMeters)} label="Distancia" style={styles.flex} />
                    </View>
                    <View style={styles.row}>
                        <Metric
                            size="medium"
                            value={average}
                            label={speed ? 'Velocidad promedio' : 'Ritmo promedio'}
                            style={styles.flex}
                        />
                        <Metric
                            size="medium"
                            value={formatElevation(activity.elevationGainMeters)}
                            label="Elevación ganada"
                            style={styles.flex}
                        />
                    </View>
                    <View style={styles.row}>
                        <Metric
                            size="medium"
                            value={formatElevation(activity.elevationLossMeters)}
                            label="Elevación perdida"
                            style={styles.flex}
                        />
                        <View style={styles.flex} />
                    </View>
                </View>

                <Text style={styles.detail}>{detalles}</Text>
            </ScrollView>

            <View style={styles.actions}>
                <PublishSection activity={activity} localId={localId} />
                {origin === 'recording' && (
                    <PrimaryButton text="Listo" onPress={() => navigation.goBack()} />
                )}
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    loading: {
        marginTop: t.spacing.xxl,
    },
    content: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    spacer: {
        flex: 1,
    },
    titles: {
        gap: t.spacing.xs,
    },
    title: {
        ...t.typography.headline,
        color: t.colors.text,
    },
    subtitle: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    metrics: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
    },
    row: {
        flexDirection: 'row',
        gap: t.spacing.lg,
    },
    flex: {
        flex: 1,
    },
    detail: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    actions: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surface,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
    publishNotice: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
        textAlign: 'center',
    },
});
