import { View, Text, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import RouteListNotice from "../../components/routes/RouteListNotice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Card from "../../components/ui/Card";
import Notice from "../../components/ui/Notice";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useFavorites } from "../../hooks/routes/useRouteLists";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { FAVORITES_MESSAGES, UNAVAILABLE_LABEL } from "../../lib/routes/format";
import { mensajeDeFallo } from "../../lib/routes/status";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// "Mis favoritas": guardadas en la cuenta, la más reciente primero (spec 007, CA-17, CA-18). Una
// ruta archivada o borrada sigue en la lista como "Ya no disponible"; al tocarla el detalle dice
// que ya no está disponible, y se puede quitar desde aquí (CA-19).
export default function FavoritesPage() {
    const navigation = useNavigation();
    const { favorites, status, retry } = useFavorites();
    const { favorite } = useRouteMutations();
    const styles = useThemedStyles(makeStyles);
    // La que se está quitando, para que su botón diga "Quitando..." y no se toque dos veces.
    const quitando = favorite.isPending ? favorite.variables?.id : undefined;

    return (
        <View style={styles.container}>
            <ScreenHeader title="Mis favoritas" onBack={() => navigation.goBack()} />
            {favorite.isError && (
                <Notice
                    type="error"
                    title="No se pudo quitar"
                    description={mensajeDeFallo(favorite.error)}
                    style={styles.error}
                />
            )}
            {status === 'success' ? (
                <FlatList
                    data={favorites}
                    keyExtractor={(f) => f.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <Card
                            onPress={() => navigation.navigate('RouteDetail', { id: item.id })}
                            accessibilityLabel={item.name}
                        >
                            <View style={styles.row}>
                                <View style={styles.texts}>
                                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                                    <Text style={styles.description}>
                                        {item.available
                                            ? [
                                                  formatDistance(item.distanceMeters),
                                                  ACTIVITY_TYPE_LABELS[item.type],
                                                  `+${formatElevation(item.elevationGainMeters)}`,
                                              ].join(' · ')
                                            : `${UNAVAILABLE_LABEL} · ${ACTIVITY_TYPE_LABELS[item.type]}`}
                                    </Text>
                                </View>
                                <TextBtn
                                    text={quitando === item.id ? 'Quitando...' : 'Quitar'}
                                    style={styles.remove}
                                    onPress={() => {
                                        if (!favorite.isPending) favorite.mutate({ id: item.id, save: false });
                                    }}
                                />
                            </View>
                        </Card>
                    )}
                />
            ) : (
                <RouteListNotice status={status} messages={FAVORITES_MESSAGES} onRetry={retry} />
            )}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    error: {
        marginHorizontal: t.spacing.lg,
        marginTop: t.spacing.md,
    },
    list: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.xs,
    },
    texts: {
        flex: 1,
        gap: t.spacing.xs,
    },
    name: {
        ...t.typography.title,
        color: t.colors.text,
    },
    description: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    // El botón de texto ocupa el ancho de su etiqueta, no toda la fila.
    remove: {
        alignSelf: 'center',
        paddingHorizontal: t.spacing.md,
    },
});
