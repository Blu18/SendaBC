import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import Chip from "../ui/Chip";
import IconButton from "../ui/IconButton";
import RangeSlider from "../ui/RangeSlider";
import BgBtn from "../ui/buttons/BgBtn";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import type { ActivityType } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import {
    DISTANCE_STEP_M,
    PEAK_STEP_M,
    distanceRangeText,
    formatFilterAltitude,
    formatFilterDistance,
    normalizeRange,
    peakRangeText,
    type ActivityFilters,
    type FilterLimits,
    type MonthOption,
    type Range,
} from "../../lib/activity/filters";
import { lightColors, type Theme } from "../../lib/theme";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    visible: boolean;
    onClose: () => void;
    // Ya ajustados a los límites (useActivityHistory).
    filters: ActivityFilters;
    onChange: (update: (current: ActivityFilters) => ActivityFilters) => void;
    onClear: () => void;
    limits: FilterLimits;
    months: MonthOption[];
    // Cuántas actividades quedan con los filtros: "Ver N actividades".
    count: number;
};

const TYPES: (ActivityType | null)[] = [null, "HIKING", "TRAIL_RUNNING", "CYCLING"];

// Con la letra a partir de este tamaño, "Quitar filtros" y "Ver N actividades" van uno debajo del
// otro, como en el marco de letra grande de Figma. Desde 110 % "Ver N actividades" ya no cabía junto
// a "Quitar filtros" en el S9+ (spec 012, CA-28). El umbral es 1.05 y no 1.1 porque Android entrega la
// escala un poco por debajo de su valor (con 130 % pasó en la 015, T17).
const STACK_FONT_SCALE = 1.05;

// "Panel de filtros" de Figma (spec 015, CA-1 a CA-7; plan D5): sube desde abajo sobre Mis
// actividades. Los cambios se aplican al momento, así que "Ver N actividades" siempre dice el número
// real y solo cierra el panel.
export default function ActivityFiltersSheet({ visible, onClose, filters, onChange, onClear, limits, months, count }: Props) {
    const styles = useThemedStyles(makeStyles);

    const reduced = useReducedMotion();
    const { fontScale, height } = useWindowDimensions();
    const stacked = fontScale >= STACK_FONT_SCALE;

    const setRange = (kind: "distance" | "peak", range: Range, kindLimits: Range) =>
        onChange((current) => ({ ...current, [kind]: normalizeRange(range, kindLimits) }));

    const verText = `Ver ${count} ${count === 1 ? "actividad" : "actividades"}`;

    return (
        <Modal
            visible={visible}
            transparent
            animationType={reduced ? "none" : "slide"}
            // Sin navigationBarTranslucent: con él el panel quedaba debajo de la barra de gestos de
            // Android y el área segura de abajo llegaba en 0, así que los botones se encimaban (T17).
            statusBarTranslucent
            onRequestClose={onClose}
        >
            {/* Proveedor propio: dentro del Modal, el área segura de la app llega en 0 y los botones
                quedaban sobre la barra de gestos de Android (T17). */}
            <SafeAreaProvider>
            <View style={styles.screen}>
                <Pressable
                    style={styles.scrim}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar los filtros"
                />
                <SafeAreaView edges={["bottom"]} style={[styles.sheet, { maxHeight: height * 0.9 }]}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.title} accessibilityRole="header">Filtros</Text>
                        <IconButton icon="close" accessibilityLabel="Cerrar los filtros" onPress={onClose} />
                    </View>

                    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        <View style={styles.group}>
                            <Text style={styles.label}>Tipo de actividad</Text>
                            <View style={styles.wrap}>
                                {TYPES.map((type) => (
                                    <Chip
                                        key={type ?? "all"}
                                        text={type ? ACTIVITY_TYPE_LABELS[type] : "Todas"}
                                        selected={filters.type === type}
                                        onPress={() => onChange((current) => ({ ...current, type }))}
                                    />
                                ))}
                            </View>
                        </View>

                        <View style={styles.group}>
                            <Text style={styles.label}>Mes</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                                {[{ key: null, title: "Todos" } as { key: string | null; title: string }, ...months].map((m) => (
                                    <Chip
                                        key={m.key ?? "all"}
                                        text={m.title}
                                        selected={filters.month === m.key}
                                        onPress={() => onChange((current) => ({ ...current, month: m.key }))}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {limits.distance && (
                            <RangeFilter
                                label="Distancia"
                                valueText={distanceRangeText(filters.distance)}
                                limits={limits.distance}
                                value={filters.distance ?? limits.distance}
                                step={DISTANCE_STEP_M}
                                format={formatFilterDistance}
                                thumbLabels={{ min: "Distancia mínima", max: "Distancia máxima" }}
                                onChange={(r) => setRange("distance", r, limits.distance!)}
                            />
                        )}
                        {limits.peak && (
                            <RangeFilter
                                label="Altura más alta"
                                valueText={peakRangeText(filters.peak)}
                                limits={limits.peak}
                                value={filters.peak ?? limits.peak}
                                step={PEAK_STEP_M}
                                format={formatFilterAltitude}
                                thumbLabels={{ min: "Altura más alta mínima", max: "Altura más alta máxima" }}
                                onChange={(r) => setRange("peak", r, limits.peak!)}
                            />
                        )}
                    </ScrollView>

                    <View style={[styles.actions, stacked && styles.actionsStacked]}>
                        {stacked ? (
                            <>
                                <PrimaryButton text={verText} onPress={onClose} />
                                <BgBtn text="Quitar filtros" onPress={onClear} />
                            </>
                        ) : (
                            <>
                                <BgBtn text="Quitar filtros" onPress={onClear} style={styles.flex} />
                                <PrimaryButton text={verText} onPress={onClose} style={styles.flex} />
                            </>
                        )}
                    </View>
                </SafeAreaView>
            </View>
            </SafeAreaProvider>
        </Modal>
    );
}

type RangeFilterProps = {
    label: string;
    valueText: string;
    limits: Range;
    value: Range;
    step: number;
    format: (meters: number) => string;
    thumbLabels: { min: string; max: string };
    onChange: (range: Range) => void;
};

// "Filtro de rango" de Figma: etiqueta y rango elegido, el control deslizante y sus límites (RN-8).
function RangeFilter({ label, valueText, limits, value, step, format, thumbLabels, onChange }: RangeFilterProps) {
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.range}>
            <View style={styles.rangeHeader}>
                <Text style={styles.rangeLabel}>{label}</Text>
                <Text style={styles.rangeValue}>{valueText}</Text>
            </View>
            <RangeSlider
                limits={limits}
                value={value}
                step={step}
                onChange={onChange}
                formatValue={format}
                labels={thumbLabels}
            />
            <View style={styles.rangeHeader} importantForAccessibility="no-hide-descendants">
                <Text style={styles.limit}>{format(limits.min)}</Text>
                <Text style={styles.limit}>{format(limits.max)}</Text>
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: "flex-end",
    },
    // Oscurece la lista igual en los dos modos, como "¿Estás bien?" (en oscuro, text la aclararía).
    scrim: {
        ...StyleSheet.absoluteFill,
        backgroundColor: lightColors.text,
        opacity: 0.4,
    },
    sheet: {
        padding: t.spacing.lg,
        paddingTop: t.spacing.sm,
        gap: t.spacing.lg,
        borderTopLeftRadius: t.radius.lg,
        borderTopRightRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
        ...t.shadows.bar,
    },
    handle: {
        alignSelf: "center",
        width: t.spacing.xxl,
        height: t.spacing.xs,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.border,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        ...t.typography.title,
        color: t.colors.text,
        flexShrink: 1,
    },
    // El ScrollView recorta lo que se sale de él, y las perillas de los controles deslizantes se
    // salen media perilla por cada lado (T17). Ocupa también el relleno del panel y lo devuelve al
    // contenido, así las perillas caben completas.
    scroll: {
        marginHorizontal: -t.spacing.lg,
    },
    content: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
    },
    group: {
        gap: t.spacing.sm,
    },
    label: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    wrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: t.spacing.sm,
    },
    row: {
        gap: t.spacing.sm,
    },
    range: {
        gap: t.spacing.xs,
    },
    // Con letra grande, el rango elegido baja de renglón en lugar de encimarse.
    rangeHeader: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "baseline",
        columnGap: t.spacing.sm,
    },
    rangeLabel: {
        ...t.typography.body,
        fontFamily: t.typography.title.fontFamily,
        color: t.colors.text,
    },
    rangeValue: {
        ...t.typography.body,
        fontFamily: t.typography.headline.fontFamily,
        color: t.colors.primary,
    },
    limit: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    actions: {
        flexDirection: "row",
        gap: t.spacing.md,
    },
    actionsStacked: {
        flexDirection: "column",
        gap: t.spacing.sm,
    },
    flex: {
        flex: 1,
    },
});
