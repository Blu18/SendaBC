import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import type { WeekSummaryText } from "../../lib/home/summary";
import { fontFamilies, type Theme } from "../../lib/theme";

// Totales de los últimos 7 días, arriba en Inicio (spec 013, CA-6; Figma "Resumen de 7 días").
// La distancia va grande y en el color de los datos; debajo, actividades, duración y elevación.
// Sin actividades en el periodo, los totales en cero y una invitación a empezar.
export default function WeekSummary({ summary }: { summary: WeekSummaryText }) {
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.box}>
            <Text style={styles.label} accessibilityRole="header">Últimos 7 días</Text>
            <Text style={styles.distance}>{summary.distance}</Text>
            <View style={styles.row}>
                <Text style={styles.total}>{summary.activities}</Text>
                <Text style={styles.total}>{summary.duration}</Text>
                <Text style={styles.total}>{summary.elevation}</Text>
            </View>
            {summary.empty && <Text style={styles.invite}>Graba una actividad para ver aquí tu semana.</Text>}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    box: {
        gap: t.spacing.xs,
    },
    label: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.textMuted,
    },
    distance: {
        ...t.typography.metric,
        color: t.colors.data,
    },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: t.spacing.lg,
        rowGap: t.spacing.xs,
    },
    total: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    invite: {
        ...t.typography.body,
        color: t.colors.textMuted,
        marginTop: t.spacing.sm,
    },
});
