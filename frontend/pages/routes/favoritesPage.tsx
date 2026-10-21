import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import RouteListNotice from "../../components/routes/RouteListNotice";
import { useFavorites } from "../../hooks/routes/useRouteLists";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { FAVORITES_MESSAGES, UNAVAILABLE_LABEL } from "../../lib/routes/format";
import { mensajeDeFallo } from "../../lib/routes/status";
import { colors } from "../../lib/theme/colors";

// "Mis favoritas": guardadas en la cuenta, la más reciente primero (spec 007, CA-17, CA-18). Una
// ruta archivada o borrada sigue en la lista como "Ya no disponible"; al tocarla el detalle dice
// que ya no está disponible, y se puede quitar desde aquí (CA-19).
export default function FavoritesPage() {
    const navigation = useNavigation();
    const { favorites, status, retry } = useFavorites();
    const { favorite } = useRouteMutations();
    // La que se está quitando, para que su botón diga "Quitando..." y no se toque dos veces.
    const quitando = favorite.isPending ? favorite.variables?.id : undefined;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mis favoritas</Text>
            {favorite.isError && <Text style={styles.error}>{mensajeDeFallo(favorite.error)}</Text>}
            {status === 'success' ? (
                <FlatList
                    data={favorites}
                    keyExtractor={(f) => f.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => navigation.navigate('RouteDetail', { id: item.id })}
                            style={({ pressed }) => [
                                styles.row,
                                !item.available && styles.rowUnavailable,
                                pressed && styles.rowPressed,
                            ]}
                        >
                            <View style={styles.rowMain}>
                                <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
                                <Text style={styles.rowMuted}>{ACTIVITY_TYPE_LABELS[item.type]}</Text>
                                {!item.available && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{UNAVAILABLE_LABEL}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.rowSide}>
                                <Text style={styles.rowValue}>{formatDistance(item.distanceMeters)}</Text>
                                <Text style={styles.rowMuted}>{formatElevation(item.elevationGainMeters)}</Text>
                                <Pressable
                                    onPress={() => {
                                        if (!favorite.isPending) favorite.mutate({ id: item.id, save: false });
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Quitar ${item.name} de favoritas`}
                                    hitSlop={8}
                                >
                                    <Text style={styles.remove}>
                                        {quitando === item.id ? 'Quitando...' : 'Quitar'}
                                    </Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    )}
                />
            ) : (
                <RouteListNotice status={status} messages={FAVORITES_MESSAGES} onRetry={retry} />
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
    error: {
        marginHorizontal: 16,
        marginBottom: 12,
        fontSize: 14,
        color: colors.error,
        textAlign: 'center',
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
    rowUnavailable: {
        borderColor: colors.textMuted,
        opacity: 0.8,
    },
    rowPressed: {
        opacity: 0.6,
    },
    rowMain: {
        flex: 1,
        gap: 4,
    },
    rowSide: {
        alignItems: 'flex-end',
        gap: 2,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    rowMuted: {
        fontSize: 13,
        color: colors.textMuted,
        fontVariant: ['tabular-nums'],
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
        backgroundColor: colors.textMuted,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.background,
    },
    remove: {
        marginTop: 6,
        fontSize: 14,
        fontWeight: '600',
        color: colors.secondary,
    },
});
