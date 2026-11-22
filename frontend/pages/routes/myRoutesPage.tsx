import { View, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import RouteListNotice from "../../components/routes/RouteListNotice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Card from "../../components/ui/Card";
import GroupedList from "../../components/ui/GroupedList";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDistance } from "../../lib/format/metrics";
import { formatPublishedAt, MY_ROUTES_MESSAGES, ROUTE_STATUS_LABELS } from "../../lib/routes/format";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// "Mis rutas": las que publiqué, publicadas y archivadas, la más reciente primero (spec 007,
// CA-21). Al tocar una se abre su detalle, donde están editar, archivar y borrar (CA-22 a CA-25).
export default function MyRoutesPage() {
    const navigation = useNavigation();
    const { routes, status, retry } = useMyRoutes();
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.container}>
            <ScreenHeader title="Mis rutas" onBack={() => navigation.goBack()} />
            {status === 'success' ? (
                // Una sola lista agrupada (spec 014, RN-13): las rutas de una cuenta son pocas, así que
                // se dibujan todas en un ScrollView.
                <ScrollView contentContainerStyle={styles.list}>
                    <Appear>
                        <GroupedList>
                            {routes.map((item) => (
                                <Card
                                    key={item.id}
                                    grouped
                                    title={item.name}
                                    description={[
                                        formatDistance(item.distanceMeters),
                                        ACTIVITY_TYPE_LABELS[item.type],
                                        ROUTE_STATUS_LABELS[item.status],
                                        formatPublishedAt(item.publishedAt),
                                    ].join(' · ')}
                                    onPress={() => navigation.navigate('RouteDetail', { id: item.id })}
                                />
                            ))}
                        </GroupedList>
                    </Appear>
                </ScrollView>
            ) : (
                <RouteListNotice status={status} messages={MY_ROUTES_MESSAGES} onRetry={retry} />
            )}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    list: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
});
