import { useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ActiveFilterChip from "../../components/activity/ActiveFilterChip";
import ActivityFiltersSheet from "../../components/activity/ActivityFiltersSheet";
import ActivityLogRow from "../../components/activity/ActivityLogRow";
import FiltersButton from "../../components/activity/FiltersButton";
import Appear from "../../components/ui/Appear";
import GroupedList from "../../components/ui/GroupedList";
import Notice from "../../components/ui/Notice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import BgBtn from "../../components/ui/buttons/BgBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useActivityHistory } from "../../hooks/activity/activityHistory.hook";
import { useActivityFilters } from "../../context/ActivityFiltersContext";
import { useSync } from "../../context/SyncContext";
import { activeFilterLabels } from "../../lib/activity/filters";
import { monthTotalsText } from "../../lib/activity/months";
import type { Activity } from "../../lib/db/activities";
import type { Theme } from "../../lib/theme";
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

// Los divisores de cada mes empiezan después de la miniatura de la fila: padding (16) +
// miniatura (64) + separación (12), como en Figma.
const DIVIDER_INSET = 92;

// "Mis actividades": actividades terminadas, la más reciente primero (spec 004, CA-20 a CA-24),
// con su estado de sincronización (spec 005, CA-14) y deslizar hacia abajo para sincronizar (CA-16).
// Spec 014: bitácora agrupada por mes, con el total de cada mes y una tarjeta por mes (CA-13 a
// CA-18). Cada elemento de la lista es un mes, porque sus filas van juntas en una lista agrupada
// (tasks, T18); solo se montan los meses cerca de la pantalla y cada fila lee su recorrido al
// montarse (plan, D4).
export default function ActivityHistoryPage() {
    const navigation = useNavigation();
    const { activities, filtered, sections, filters, limits, months, loading, reload } = useActivityHistory();
    const { setFilters, clearFilters } = useActivityFilters();
    const { syncNow } = useSync();
    const [refreshing, setRefreshing] = useState(false);
    const [aviso, setAviso] = useState<Aviso | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Spec 015: filtros activos como chips (CA-7). Sin actividades no hay nada que filtrar: el
    // botón no aparece (Figma, lista vacía).
    const activeLabels = activeFilterLabels(filters, new Date());
    const hasActivities = activities.length > 0;
    const noResults = hasActivities && filtered.length === 0;
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
            <ScreenHeader
                title="Mis actividades"
                actions={
                    hasActivities ? <FiltersButton count={activeLabels.length} onPress={() => setFiltersOpen(true)} /> : null
                }
            />

            {/* Filtros activos y "Quitar filtros" (CA-7). Tocar un chip quita solo ese filtro. */}
            {activeLabels.length > 0 && (
                <View style={styles.activeFilters}>
                    {activeLabels.map(({ kind, label }) => (
                        <ActiveFilterChip
                            key={kind}
                            label={label}
                            onRemove={() => setFilters((current) => ({ ...current, [kind]: null }))}
                        />
                    ))}
                    <TextBtn text="Quitar filtros" onPress={clearFilters} />
                </View>
            )}

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            ) : (
                <FlatList
                    data={sections}
                    keyExtractor={(s) => s.key}
                    contentContainerStyle={styles.list}
                    initialNumToRender={2}
                    maxToRenderPerBatch={2}
                    windowSize={5}
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
                        noResults ? (
                            // Hay actividades, pero ninguna pasa los filtros (spec 015, CA-8).
                            <View style={styles.noResults}>
                                <Notice
                                    title="Ninguna actividad coincide"
                                    description="Prueba con otros filtros o quítalos para ver todas tus actividades."
                                />
                                <BgBtn text="Quitar filtros" onPress={clearFilters} />
                            </View>
                        ) : (
                        // Sin actividades terminadas: invitar a iniciar una (CA-22). Sin botón propio:
                        // grabar desde aquí haría que "Listo" regresara a esta lista y no al Inicio (CA-2)
                        <Appear>
                            <Notice
                                title="Aún no tienes actividades"
                                description="Inicia una desde la pestaña Inicio y aquí verás su resumen."
                            />
                        </Appear>
                        )
                    }
                    ListFooterComponent={
                        filtered.length > 0 ? (
                            <Text style={styles.hint}>Desliza hacia abajo para sincronizar.</Text>
                        ) : null
                    }
                    renderItem={({ item: month }) => {
                        const totals = monthTotalsText(month);
                        return (
                            <View style={styles.month}>
                                <View
                                    style={styles.monthHeader}
                                    accessible
                                    accessibilityRole="header"
                                    accessibilityLabel={`${month.title}: ${totals}`}
                                >
                                    <Text style={styles.monthTitle}>{month.title}</Text>
                                    <Text style={styles.monthTotals}>{totals}</Text>
                                </View>
                                <GroupedList inset={DIVIDER_INSET}>
                                    {month.data.map((a) => (
                                        <ActivityLogRow key={a.localId} activity={a} onPress={() => openSummary(a)} />
                                    ))}
                                </GroupedList>
                            </View>
                        );
                    }}
                />
            )}

            <ActivityFiltersSheet
                visible={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={filters}
                onChange={setFilters}
                onClear={clearFilters}
                limits={limits}
                months={months}
                count={filtered.length}
            />
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
        gap: t.spacing.xl,
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.xs,
        paddingBottom: t.spacing.xl,
    },
    month: {
        gap: t.spacing.sm,
    },
    // Chips de filtros activos debajo del encabezado; bajan de renglón si no caben (Figma).
    activeFilters: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.xs,
        paddingBottom: t.spacing.md,
    },
    noResults: {
        gap: t.spacing.md,
    },
    // Con letra grande el total baja de renglón en lugar de encimarse (CA-24).
    monthHeader: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        justifyContent: "space-between",
        columnGap: t.spacing.sm,
        paddingHorizontal: t.spacing.xs,
    },
    monthTitle: {
        ...t.typography.title,
        color: t.colors.text,
    },
    monthTotals: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    hint: {
        ...t.typography.caption,
        color: t.colors.textMuted,
        textAlign: 'center',
    },
});
