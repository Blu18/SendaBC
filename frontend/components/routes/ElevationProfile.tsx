import { useState } from "react";
import { View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { perfilParaGrafica, type Perfil } from "../../lib/routes/profile";
import { colors } from "../../lib/theme/colors";

// Ancho de cada columna en puntos de pantalla y alto de la gráfica. Con ~4 pt por columna, un
// teléfono de 360 pt dibuja unas 80, suficientes para 200 puntos de perfil (plan D2, D4).
const ANCHO_COLUMNA = 4;
const MAX_COLUMNAS = 100;
const ALTO = 120;
// Una columna en la altitud mínima se ve igual, como una franja delgada.
const ALTO_MINIMO = 3;

// Perfil de elevación: altitud contra distancia recorrida (spec 007, CA-11). Cada columna es un
// tramo de la ruta y su altura, la altitud máxima de ese tramo. Sin un mínimo de dos puntos se
// explica que no hay datos (plan, riesgos).
export default function ElevationProfile({ perfil }: { perfil: Perfil | null }) {
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
                        />
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

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        gap: 4,
    },
    chartRow: {
        flexDirection: 'row',
        gap: 6,
    },
    yAxis: {
        height: ALTO,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        minWidth: 48,
    },
    chart: {
        flex: 1,
        height: ALTO,
        flexDirection: 'row',
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        borderColor: colors.textMuted,
    },
    column: {
        flex: 1,
        backgroundColor: colors.data,
    },
    xAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginLeft: 54,
    },
    axisText: {
        fontSize: 12,
        color: colors.textMuted,
        fontVariant: ['tabular-nums'],
    },
    empty: {
        fontSize: 14,
        color: colors.textMuted,
    },
});
