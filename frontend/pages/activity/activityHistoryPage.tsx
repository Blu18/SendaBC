import { useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import { useActivityHistory } from "../../hooks/activity/activityHistory.hook";
import { useSync } from "../../context/SyncContext";
import type { Activity, ActivityType } from "../../lib/db/activities";
import PressableScale from "../../components/ui/PressableScale";
import SyncBadge from "../../components/ui/SyncBadge";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import Icon, { type IconName } from "../../components/ui/Icon";
import { ACTIVITY_TYPE_LABELS, formatStartedAt, syncStatusOf } from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance } from "../../lib/format/metrics";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// Mensajes al deslizar para sincronizar (spec 005, CA-16), como título y descripción de un aviso.
type Aviso = { type: 'offline' | 'error'; title: string; description: string };
const AVISO_SIN_CONEXION: Aviso = {
    type: 'offline',
    title: 'Sin conexión',
    description: 'Se sincronizará cuando vuelva la señal.',
};
const AVISO_REINTENTO: Aviso = {
    type: 'error',
    title: 'No se pudo conectar con el servidor',
    description: 'Se volverá a intentar en unos minutos.',
};

const TYPE_ICONS: Record<ActivityType, IconName> = {
    HIKING: 'hiking',
    TRAIL_RUNNING: 'run',
    CYCLING: 'bike',
};

// "Mis actividades": actividades terminadas, la más reciente primero (spec 004, CA-20 a CA-24),
// con su estado de sincronización (spec 005, CA-14) y deslizar hacia abajo para sincronizar (CA-16).
export default function ActivityHistoryPage() {
    const navigation = useNavigation();
    const { activities, loading, reload } = useActivityHistory();
    const { syncNow } = useSync();
    const [refreshing, setRefreshing] = useState(false);
    const [aviso, setAviso] = useState<Aviso | null>(null);
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);

    // Sincronización manual: también reintenta las que no se pudieron subir (CA-16).
    const onRefresh = async () => {
        setRefreshing(true);
        setAviso(null);
        try {
            const resultado = await syncNow();
            if (resultado === "offline") setAviso(AVISO_SIN_CONEXION);
            else if (resultado === "retry") setAviso(AVISO_REINTENTO);
            await reload();
        } finally {
            setRefreshing(false);
        }
    };

    const openSummary = (activity: Activity) =>
        navigation.navigate('ActivitySummary', { localId: activity.localId, origin: 'history' });

    return (
        <View style={styles.container}>
            <ScreenHeader title="Mis actividades" />

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(a) => String(a.localId)}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                            progressBackgroundColor={theme.colors.surface}
                            tintColor={theme.colors.primary}
                        />
                    }
                    ListHeaderComponent={
                        <Appear>
                            {aviso ? <Notice type={aviso.type} title={aviso.title} description={aviso.description} /> : null}
                        </Appear>
                    }
                    ListEmptyComponent={
                        // Sin actividades terminadas: invitar a iniciar una (CA-22). Sin botón propio:
                        // grabar desde aquí haría que "Listo" regresara a esta lista y no al Inicio (CA-2)
                        <Appear>
                            <Notice
                                title="Aún no tienes actividades"
                                description="Inicia una desde la pestaña Inicio y aquí verás su resumen."
                            />
                        </Appear>
                    }
                    ListFooterComponent={
                        activities.length > 0 ? (
                            <Text style={styles.hint}>Desliza hacia abajo para sincronizar.</Text>
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <Appear>
                            <PressableScale
                                onPress={() => openSummary(item)}
                                accessibilityRole="button"
                                style={styles.row}
                                pressedStyle={styles.rowPressed}
                            >
                                <View style={styles.typeIcon}>
                                    <Icon name={TYPE_ICONS[item.type]} decorative />
                                </View>
                                <View style={styles.rowMain}>
                                    <Text style={styles.rowType}>{ACTIVITY_TYPE_LABELS[item.type]}</Text>
                                    <Text style={styles.rowDate}>{formatStartedAt(item.startedAt)}</Text>
                                    <SyncBadge status={syncStatusOf(item)} />
                                </View>
                                <View style={styles.rowStats}>
                                    <Text style={styles.rowValue}>{formatDistance(item.distanceMeters)}</Text>
                                    <Text style={styles.rowMuted}>
                                        {item.durationSeconds === null ? '—' : formatDuration(item.durationSeconds)}
                                    </Text>
                                </View>
                            </PressableScale>
                        </Appear>
                    )}
                />
            )}
        </View>
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
    list: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    hint: {
        ...t.typography.caption,
        color: t.colors.textMuted,
        textAlign: 'center',
    },
    row: {
        minHeight: t.touchMin,
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
        overflow: 'hidden',
    },
    rowPressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    typeIcon: {
        width: 40,
        height: 40,
        borderRadius: t.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.background,
    },
    rowMain: {
        flex: 1,
        gap: t.spacing.xs,
    },
    rowType: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    rowDate: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    rowStats: {
        alignItems: 'flex-end',
        gap: t.spacing.xs,
    },
    rowValue: {
        ...t.typography.title,
        fontFamily: fontFamilies.bold,
        fontVariant: ['tabular-nums'],
        color: t.colors.data,
    },
    rowMuted: {
        ...t.typography.bodySmall,
        fontVariant: ['tabular-nums'],
        color: t.colors.textMuted,
    },
});
