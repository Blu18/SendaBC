import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useActivityHistory } from "../../hooks/activity/activityHistory.hook";
import type { Activity } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS, formatStartedAt } from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance } from "../../lib/format/metrics";
import { colors } from "../../lib/theme/colors";

// "Mis actividades": actividades terminadas, la más reciente primero (spec 004, CA-20 a CA-24)
export default function ActivityHistoryPage() {
    const navigation = useNavigation();
    const { activities, loading } = useActivityHistory();

    const openSummary = (activity: Activity) =>
        navigation.navigate('ActivitySummary', { localId: activity.localId, origin: 'history' });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mis actividades</Text>

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
            ) : (
                <FlatList
                    data={activities}
                    keyExtractor={(a) => String(a.localId)}
                    contentContainerStyle={activities.length === 0 ? styles.emptyContainer : styles.list}
                    ListEmptyComponent={
                        // Sin actividades terminadas: invitar a iniciar una (CA-22). Sin botón propio:
                        // grabar desde aquí haría que "Listo" regresara a esta lista y no a la
                        // pantalla principal (CA-2)
                        <Text style={styles.emptyText}>
                            Aún no tienes actividades. Inicia una con "Nueva actividad" en la pantalla
                            principal y aquí verás su resumen.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => openSummary(item)}
                            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        >
                            <View style={styles.rowMain}>
                                <Text style={styles.rowType}>{ACTIVITY_TYPE_LABELS[item.type]}</Text>
                                <Text style={styles.rowDate}>{formatStartedAt(item.startedAt)}</Text>
                            </View>
                            <View style={styles.rowStats}>
                                <Text style={styles.rowValue}>{formatDistance(item.distanceMeters)}</Text>
                                <Text style={styles.rowMuted}>
                                    {item.durationSeconds === null ? '—' : formatDuration(item.durationSeconds)}
                                </Text>
                            </View>
                        </Pressable>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 24,
        backgroundColor: colors.background,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    loading: {
        marginTop: 32,
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 10,
    },
    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    rowPressed: {
        opacity: 0.7,
    },
    rowMain: {
        flex: 1,
        gap: 2,
    },
    rowType: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    rowDate: {
        fontSize: 13,
        color: colors.textMuted,
    },
    rowStats: {
        alignItems: 'flex-end',
        gap: 2,
    },
    rowValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    rowMuted: {
        fontSize: 13,
        color: colors.textMuted,
        fontVariant: ['tabular-nums'],
    },
});
