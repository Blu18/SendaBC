import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, type AccessibilityActionEvent } from "react-native";
import type { Theme } from "../../lib/theme";
import type { Range } from "../../lib/activity/filters";
import { fractionOf, moveThumb, stepThumb, valueAtFraction, type Thumb } from "../../lib/ui/rangeSlider";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    // Del valor más bajo al más alto de las actividades (RN-8).
    limits: Range;
    // El rango elegido; con los extremos en los límites, el filtro está inactivo.
    value: Range;
    step: number;
    onChange: (range: Range) => void;
    // Cómo se lee un valor: "5 km", "800 m".
    formatValue: (value: number) => string;
    // Nombre de cada extremo para el lector de pantalla: "Distancia mínima", "Distancia máxima".
    labels: Record<Thumb, string>;
};

// Diámetro de la perilla de Figma ("Control deslizante de rango").
const KNOB = 24;

// "Control deslizante de rango" de Figma (spec 015, plan D4): dos extremos que no se cruzan, con
// PanResponder de React Native, sin dependencias. Cada extremo tiene el área táctil mínima y es
// ajustable con TalkBack: sube o baja un paso sin arrastrar.
export default function RangeSlider({ limits, value, step, onChange, formatValue, labels }: Props) {
    const styles = useThemedStyles(makeStyles);
    const [width, setWidth] = useState(0);

    // Los PanResponder se crean una vez y leen lo último por esta referencia.
    const latest = useRef({ limits, value, step, onChange, width });
    latest.current = { limits, value, step, onChange, width };

    const responders = useMemo(() => {
        const make = (thumb: Thumb) => {
            let startX = 0;
            return PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: () => true,
                // El panel no se desplaza mientras se arrastra un extremo (plan, "Riesgos").
                onPanResponderTerminationRequest: () => false,
                onPanResponderGrant: () => {
                    const { limits: l, value: v, width: w } = latest.current;
                    startX = fractionOf(v[thumb], l) * w;
                },
                onPanResponderMove: (_, gesture) => {
                    const { limits: l, value: v, step: s, onChange: change, width: w } = latest.current;
                    if (w <= 0) return;
                    const next = moveThumb(v, thumb, valueAtFraction((startX + gesture.dx) / w, l, s), l);
                    if (next.min !== v.min || next.max !== v.max) change(next);
                },
            });
        };
        return { min: make("min"), max: make("max") };
    }, []);

    const onAction = (thumb: Thumb) => (event: AccessibilityActionEvent) => {
        const direction = event.nativeEvent.actionName === "increment" ? 1 : event.nativeEvent.actionName === "decrement" ? -1 : 0;
        if (direction === 0) return;
        const next = stepThumb(value, thumb, direction, step, limits);
        if (next.min !== value.min || next.max !== value.max) onChange(next);
    };

    const x = (v: number) => fractionOf(v, limits) * width;
    const left = x(value.min);
    const right = x(value.max);

    return (
        <View style={styles.container}>
            <View style={styles.rail} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
                <View style={styles.track} />
                <View style={[styles.active, { left, width: Math.max(0, right - left) }]} />
                {(["min", "max"] as const).map((thumb) => (
                    <View
                        key={thumb}
                        {...responders[thumb].panHandlers}
                        style={[styles.hit, { left: (thumb === "min" ? left : right) - styles.hit.width / 2 }]}
                        accessible
                        accessibilityRole="adjustable"
                        accessibilityLabel={labels[thumb]}
                        accessibilityValue={{ text: formatValue(value[thumb]) }}
                        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
                        onAccessibilityAction={onAction(thumb)}
                    >
                        <View style={styles.knob} />
                    </View>
                ))}
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    // El riel ocupa el ancho del bloque, como en Figma, y las áreas táctiles se salen media perilla
    // por cada lado: el margen negativo las deja dentro del contenedor, porque en Android un toque
    // fuera de los límites del padre no llega.
    container: {
        marginHorizontal: -t.touchMin / 2,
        paddingHorizontal: t.touchMin / 2,
    },
    rail: {
        height: t.touchMin,
        justifyContent: "center",
    },
    track: {
        height: 4,
        borderRadius: 2,
        backgroundColor: t.colors.border,
    },
    active: {
        position: "absolute",
        height: 4,
        backgroundColor: t.colors.primary,
    },
    hit: {
        position: "absolute",
        top: 0,
        width: t.touchMin,
        height: t.touchMin,
        alignItems: "center",
        justifyContent: "center",
    },
    knob: {
        width: KNOB,
        height: KNOB,
        borderRadius: t.radius.pill,
        borderWidth: 3,
        borderColor: t.colors.primary,
        backgroundColor: t.colors.surface,
        ...t.shadows.low,
    },
});
