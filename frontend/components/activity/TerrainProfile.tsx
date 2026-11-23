import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import { formatElevation } from "../../lib/format/metrics";
import type { ActivityProfile } from "../../lib/metrics/profile";
import { perfilParaGrafica } from "../../lib/routes/profile";
import type { Theme } from "../../lib/theme";

// Alto de la cresta (la parte dibujada en Svg) y espacio libre arriba para la etiqueta de la cumbre.
const RIDGE_HEIGHT = 120;
const TOP_SPACE = 44;
// Una columna en la altitud mínima no queda en cero: la montaña siempre tiene cuerpo.
const MIN_BODY = 0.12;
// Ancho de cada tramo de la cresta en puntos de pantalla, como el perfil de las rutas (spec 007).
const COLUMN_WIDTH = 4;
const DOT_RADIUS = 6;

type Props = {
    profile: ActivityProfile;
    gainMeters: number | null; // cifras guardadas de la actividad (spec 004, RN-1)
    lossMeters: number | null;
};

// Altura de una altitud en la cresta: 0 arriba del todo, RIDGE_HEIGHT en la base.
function yFor(altura: number) {
    const h = MIN_BODY + (1 - MIN_BODY) * Math.max(0, Math.min(1, altura));
    return TOP_SPACE + RIDGE_HEIGHT * (1 - h);
}

/**
 * Perfil de elevación de la actividad, protagonista del resumen (spec 014, CA-4, CA-5, CA-23,
 * CA-24). Va en una tarjeta con sombra media, como en Figma (RN-13):
 * - arriba, la cresta en Svg con las columnas de `perfilParaGrafica` (spec 007), unidas con curvas;
 * - la cumbre marcada en ocre, con una línea guía y su etiqueta "1412 m aprox." (RN-5);
 * - abajo, una View del mismo color que la montaña con la subida y la bajada. No va dentro del
 *   Svg para que crezca con el tamaño de letra y se pueda leer con lector de pantalla (plan, D5).
 * Para el lector de pantalla, todo es un solo elemento que dice las tres cifras.
 */
export default function TerrainProfile({ profile, gainMeters, lossMeters }: Props) {
    const { colors } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [width, setWidth] = useState(0);
    const [labelWidth, setLabelWidth] = useState(0);

    const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
    const columns = Math.max(2, Math.floor(width / COLUMN_WIDTH));
    const chart = width > 0 ? perfilParaGrafica(profile.perfil, columns) : null;

    const gain = formatElevation(gainMeters);
    const loss = formatElevation(lossMeters);
    const peak = `${formatElevation(profile.cumbre.altitudM)} aprox.`;

    let ridge: string | null = null;
    let peakX = 0;
    let peakY = 0;
    if (chart) {
        const n = chart.columnas.length;
        const pts = chart.columnas.map((c, i) => [(width * i) / (n - 1), yFor(c.altura)] as const);
        // Curvas cuadráticas por los puntos medios: la cresta se ve suave sin inventar picos.
        let d = `M 0 ${TOP_SPACE + RIDGE_HEIGHT} L ${pts[0][0]} ${pts[0][1]}`;
        for (let i = 1; i < n - 1; i++) {
            const mx = (pts[i][0] + pts[i + 1][0]) / 2;
            const my = (pts[i][1] + pts[i + 1][1]) / 2;
            d += ` Q ${pts[i][0]} ${pts[i][1]} ${mx} ${my}`;
        }
        d += ` L ${pts[n - 1][0]} ${pts[n - 1][1]} L ${width} ${TOP_SPACE + RIDGE_HEIGHT} Z`;
        ridge = d;

        const inicio = profile.perfil[0][0];
        const rango = chart.altitudMaxM - chart.altitudMinM;
        peakX = (width * (profile.cumbre.distanciaM - inicio)) / chart.distanciaTotalM;
        peakY = yFor(rango === 0 ? 0.5 : (profile.cumbre.altitudM - chart.altitudMinM) / rango);
    }
    const labelLeft = Math.max(8, Math.min(width - labelWidth - 8, peakX - labelWidth / 2));

    return (
        <View
            style={styles.card}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`Perfil de elevación: subiste ${gain}, bajaste ${loss}, punto más alto ${formatElevation(profile.cumbre.altitudM)} aproximadamente`}
        >
            <View style={styles.ridge} onLayout={onLayout}>
                {ridge && (
                    <Svg width={width} height={TOP_SPACE + RIDGE_HEIGHT} style={StyleSheet.absoluteFill}>
                        <Path d={ridge} fill={colors.primary} />
                        <Line
                            x1={peakX}
                            y1={peakY + DOT_RADIUS + 2}
                            x2={peakX}
                            y2={TOP_SPACE + RIDGE_HEIGHT}
                            stroke={colors.onPrimary}
                            strokeOpacity={0.45}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                        />
                        <Circle cx={peakX} cy={peakY} r={DOT_RADIUS} fill={colors.secondary} stroke={colors.surface} strokeWidth={3} />
                    </Svg>
                )}
                {chart && (
                    <View
                        style={[styles.peakLabel, { left: labelLeft, top: Math.max(0, peakY - 40) }]}
                        onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
                    >
                        <Text style={styles.peakValue}>{peak}</Text>
                        <Text style={styles.peakText}>punto más alto</Text>
                    </View>
                )}
            </View>
            <View style={styles.base}>
                <View style={styles.figure}>
                    <Text style={styles.value}>+{gain}</Text>
                    <Text style={styles.label}>Subida</Text>
                </View>
                <View style={[styles.figure, styles.figureEnd]}>
                    <Text style={styles.value}>−{loss}</Text>
                    <Text style={styles.label}>Bajada</Text>
                </View>
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    card: {
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
        overflow: "hidden",
        ...t.shadows.medium,
    },
    ridge: {
        height: TOP_SPACE + RIDGE_HEIGHT,
    },
    peakLabel: {
        position: "absolute",
        flexDirection: "row",
        alignItems: "baseline",
        gap: t.spacing.xs,
        paddingHorizontal: t.spacing.sm + t.spacing.xxs,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.surface,
        ...t.shadows.low,
    },
    peakValue: {
        ...t.typography.caption,
        fontFamily: t.typography.title.fontFamily,
        color: t.colors.text,
    },
    peakText: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    // Continúa la montaña: crece con la letra en lugar de cortar las cifras (D5, CA-24).
    base: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.xs,
        paddingBottom: t.spacing.md,
        backgroundColor: t.colors.primary,
    },
    figure: {
        flexShrink: 1,
    },
    figureEnd: {
        alignItems: "flex-end",
        marginLeft: "auto",
    },
    value: {
        ...t.typography.title,
        color: t.colors.onPrimary,
    },
    label: {
        ...t.typography.caption,
        color: t.colors.onPrimary,
    },
});
