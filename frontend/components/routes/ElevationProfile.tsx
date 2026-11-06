import { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { perfilParaGrafica, type Perfil } from "../../lib/routes/profile";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// Ancho de cada columna en puntos de pantalla y alto de la gráfica. Con ~4 pt por columna, un
// teléfono de 360 pt dibuja unas 80, suficientes para 200 puntos de perfil (plan D2, D4).
const ANCHO_COLUMNA = 4;
const MAX_COLUMNAS = 100;
const ALTO = 96;
// Una columna en la altitud mínima se ve igual, como una franja delgada.
const ALTO_MINIMO = 3;

// Perfil de elevación: altitud contra distancia recorrida (spec 007, CA-11). Cada columna es un
// tramo de la ruta y su altura, la altitud máxima de ese tramo. Como en Figma (spec 009), el área
// va en data al 15 % y el borde de arriba de cada columna en data hace de línea. Sin un mínimo de
// dos puntos se explica que no hay datos (plan, riesgos).
export default function ElevationProfile({ perfil }: { perfil: Perfil | null }) {
    const styles = useThemedStyles(makeStyles);
    const [ancho, setAncho] = useState(0);
    const onLayout = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);

    const columnas = Math.min(MAX_COLUMNAS, Math.max(1, Math.floor(ancho / ANCHO_COLUMNA)));
    const grafica = ancho > 0 ? perfilParaGrafica(perfil, columnas) : null;

    if (!perfil || perfil.length < 2) {
        return <Text style={styles.empty}>Esta ruta no tiene datos de elevación.</Text>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.chartRow}>
                <View style={styles.yAxis}>
                    <Text style={styles.axisText}>{grafica ? formatElevation(grafica.altitudMaxM) : ''}</Text>
                    <Text style={styles.axisText}>{grafica ? formatElevation(grafica.altitudMinM) : ''}</Text>
                </View>
                <View
                    style={styles.chart}
                    onLayout={onLayout}
                    accessible
                    accessibilityLabel={
                        grafica
                            ? `Perfil de elevación: de ${formatElevation(grafica.altitudMinM)} a ${formatElevation(grafica.altitudMaxM)} en ${formatDistance(grafica.distanciaTotalM)}`
                            : 'Perfil de elevación'
                    }
                >
                    {grafica?.columnas.map((columna, i) => (
                        <View
                            key={i}
                            style={[
                                styles.column,
                                { height: ALTO_MINIMO + columna.altura * (ALTO - ALTO_MINIMO) },
                            ]}
                        >
                            <View style={styles.area} />
                        </View>
                    ))}
                </View>
            </View>
            <View style={styles.xAxis}>
                <Text style={styles.axisText}>0 km</Text>
                <Text style={styles.axisText}>{grafica ? formatDistance(grafica.distanciaTotalM) : ''}</Text>
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        gap: t.spacing.xs,
    },
    chartRow: {
        flexDirection: 'row',
        gap: t.spacing.sm,
    },
    yAxis: {
        height: ALTO,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        minWidth: t.spacing.xxxl,
    },
    chart: {
        flex: 1,
        height: ALTO,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderColor: t.colors.border,
    },
    column: {
        flex: 1,
        borderTopWidth: 2,
        borderTopColor: t.colors.data,
    },
    area: {
        flex: 1,
        backgroundColor: t.colors.data,
        opacity: 0.15,
    },
    xAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: t.spacing.xxxl + t.spacing.sm,
    },
    axisText: {
        ...t.typography.caption,
        fontVariant: ['tabular-nums'],
        color: t.colors.textMuted,
    },
    empty: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
});
