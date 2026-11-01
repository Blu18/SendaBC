import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import { splitUnit } from "../../lib/format/metrics";

interface MetricProps {
    // Texto ya formateado ("5.42 km", "01:23:45"); la unidad se separa para mostrarla más chica.
    value: string;
    label: string;
    // large: grabación en vivo (metric en data, CA-12). medium: resumen (display en text).
    size?: "large" | "medium";
    style?: StyleProp<ViewStyle>;
}

// Métrica de Figma: número grande, unidad más chica para que quepa en media pantalla y etiqueta.
export default function Metric({ value, label, size = "large", style }: MetricProps) {
    const styles = useThemedStyles(makeStyles);
    const { value: number, unit } = splitUnit(value);
    const large = size === "large";
    return (
        <View style={[styles.metric, style]} accessible accessibilityLabel={`${label}: ${value}`}>
            <View style={styles.value}>
                <Text style={large ? styles.numberLarge : styles.numberMedium} numberOfLines={1} adjustsFontSizeToFit>
                    {number}
                </Text>
                {unit ? <Text style={large ? styles.unitLarge : styles.unitMedium}>{unit}</Text> : null}
            </View>
            <Text style={large ? styles.labelLarge : styles.labelMedium}>{label}</Text>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    metric: {
        alignItems: "flex-start",
    },
    value: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: t.spacing.xs,
    },
    numberLarge: {
        ...t.typography.metric,
        color: t.colors.data,
    },
    unitLarge: {
        ...t.typography.title,
        fontFamily: fontFamilies.bold,
        color: t.colors.data,
    },
    numberMedium: {
        ...t.typography.display,
        fontVariant: ["tabular-nums"],
        color: t.colors.text,
    },
    unitMedium: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    labelLarge: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    labelMedium: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
});
