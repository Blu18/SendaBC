import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import RouteListNotice from "../../components/routes/RouteListNotice";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance } from "../../lib/format/metrics";
import { formatPublishedAt, MY_ROUTES_MESSAGES, ROUTE_STATUS_LABELS } from "../../lib/routes/format";
import { colors } from "../../lib/theme/colors";

// "Mis rutas": las que publiqué, publicadas y archivadas, la más reciente primero (spec 007,
// CA-21). Al tocar una se abre su detalle, donde están editar, archivar y borrar (CA-22 a CA-25).
export default function MyRoutesPage() {
    const navigation = useNavigation();
    const { routes, status, retry } = useMyRoutes();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mis rutas</Text>
            {status === 'success' ? (
                <FlatList
                    data={routes}
                    keyExtractor={(r) => r.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => navigation.navigate('RouteDetail', { id: item.id })}
                            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                        >
                            <View style={styles.rowMain}>
                                <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
                                <Text style={styles.rowMuted}>
                                    {ACTIVITY_TYPE_LABELS[item.type]} · {formatPublishedAt(item.publishedAt)}
                                </Text>
                                <View style={[styles.badge, item.status === 'ARCHIVED' && styles.badgeArchived]}>
                                    <Text style={styles.badgeText}>{ROUTE_STATUS_LABELS[item.status]}</Text>
                                </View>
                            </View>
                            <Text style={styles.rowValue}>{formatDistance(item.distanceMeters)}</Text>
                        </Pressable>
                    )}
                />
            ) : (
                <RouteListNotice status={status} messages={MY_ROUTES_MESSAGES} onRetry={retry} />
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
    list: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
        gap: 4,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    rowMuted: {
        fontSize: 13,
        color: colors.textMuted,
    },
    rowValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: colors.primary,
    },
    badgeArchived: {
        backgroundColor: colors.textMuted,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.background,
    },
});
