import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import RouteListNotice from "../../components/routes/RouteListNotice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Card from "../../components/ui/Card";
import GroupedList from "../../components/ui/GroupedList";
import Notice from "../../components/ui/Notice";
import TextBtn from "../../components/ui/buttons/TextBtn";
import BgBtn from "../../components/ui/buttons/BgBtn";
import { useFavorites } from "../../hooks/routes/useRouteLists";
import { useLeavingItems } from "../../hooks/theme/useLeavingItems";
import { byId } from "../../lib/lists/leaving";
import { useRouteMutations } from "../../hooks/routes/useRouteMutations";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { FAVORITES_MESSAGES, UNAVAILABLE_LABEL } from "../../lib/routes/format";
import { avisoDeGuardado, mensajeDeFallo } from "../../lib/routes/status";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// "Mis favoritas": guardadas en la cuenta, la más reciente primero (spec 007, CA-17, CA-18). Una
// ruta archivada o borrada sigue en la lista como "Ya no disponible"; al tocarla el detalle dice
// que ya no está disponible, y se puede quitar desde aquí (CA-19). Sin conexión se ven las de la
// última vez que hubo, con un aviso de cuándo son; quitar una avisa que necesita conexión (spec
// 011, CA-56, CA-58).
export default function FavoritesPage() {
    const navigation = useNavigation();
    const { favorites, savedAt, status, retry } = useFavorites();
    const { favorite } = useRouteMutations();
    const rows = useLeavingItems(favorites, byId);
    const styles = useThemedStyles(makeStyles);
    // La que se está quitando, para que su botón diga "Quitando..." y no se toque dos veces.
    const quitando = favorite.isPending ? favorite.variables?.id : undefined;

    return (
        <View style={styles.container}>
            <ScreenHeader title="Mis favoritas" onBack={() => navigation.goBack()} />
            <Appear>
                {favorite.isError && (
                    <Notice
                        type="error"
                        title="No se pudo quitar"
                        description={mensajeDeFallo(favorite.error)}
                        style={styles.error}
                    />
                )}
            </Appear>
            {status === 'success' || status === 'saved' ? (
                // Una sola lista agrupada (spec 014, RN-13). Al quitar una, su fila sale con la misma
                // animación de antes (useLeavingItems) y el grupo se ajusta.
                <ScrollView contentContainerStyle={styles.list}>
                    {status === 'saved' && savedAt ? (
                        <Appear style={styles.saved}>
                            <Notice type="offline" title="Datos guardados" description={avisoDeGuardado(savedAt)} />
                            <BgBtn text="Reintentar" onPress={retry} />
                        </Appear>
                    ) : null}
                    {rows.length === 0 ? (
                        // Solo con la lista guardada vacía: con red, la lista vacía es status 'empty'.
                        <Notice type="info" title="Nada por aquí todavía" description={FAVORITES_MESSAGES.empty} />
                    ) : (
                        <GroupedList>
                            {rows.map(({ item, leaving }) => (
                                <Appear key={item.id}>{!leaving && (
                                    <Card
                                        grouped
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
                                    )}</Appear>
                            ))}
                        </GroupedList>
                    )}
                </ScrollView>
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
    saved: {
        gap: t.spacing.sm,
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
