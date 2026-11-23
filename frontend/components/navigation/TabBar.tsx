import { useEffect, useRef } from "react";
import { Animated, View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import PressableScale from "../ui/PressableScale";

// Ancho del indicador al empezar a aparecer, respecto al final.
const INDICATOR_START_SCALE = 0.5;

// Aparece creciendo a lo ancho y desaparece encogiéndose (spec 010, CA-24). Con la opción de
// reducir animaciones solo cambia, sin transición (CA-27).
function TabIndicator({ focused, style }: { focused: boolean; style: StyleProp<ViewStyle> }) {
    const { motion } = useTheme();
    const reduced = useReducedMotion();
    const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: focused ? 1 : 0,
            duration: reduced ? 0 : motion.content,
            useNativeDriver: true,
        }).start();
    }, [focused, reduced, motion.content, progress]);

    const scaleX = reduced ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [INDICATOR_START_SCALE, 1] });

    return (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: progress, transform: [{ scaleX }] }]}>
            <View style={style} />
        </Animated.View>
    );
}

// Barra de pestañas de Figma (spec 009, plan D1). La pestaña activa lleva el ícono relleno
// sobre un indicador de primary al 16 % y la etiqueta en Bold primary; las demás, el ícono de
// contorno y la etiqueta en textMuted. Cada pestaña ocupa 64 dp de alto (CA-13).
// Los íconos los da cada pantalla con tabBarIcon, que recibe `focused` y el color.
export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.bar} accessibilityRole="tablist">
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const focused = state.index === index;
                const label = options.title ?? route.name;

                const onPress = () => {
                    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                };

                return (
                    <PressableScale
                        key={route.key}
                        onPress={onPress}
                        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: focused }}
                        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                        style={styles.tab}
                    >
                        <View style={styles.indicator}>
                            <TabIndicator focused={focused} style={styles.indicatorLayer} />
                            {options.tabBarIcon?.({
                                focused,
                                color: focused ? theme.colors.primary : theme.colors.text,
                                size: 24,
                            })}
                        </View>
                        <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                            {label}
                        </Text>
                    </PressableScale>
                );
            })}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    bar: {
        flexDirection: "row",
        backgroundColor: t.colors.surface,
        // Sombra hacia arriba en lugar del borde (spec 014, RN-13).
        ...t.shadows.bar,
        paddingBottom: t.spacing.xs,
    },
    tab: {
        flex: 1,
        minHeight: 64,
        paddingVertical: t.spacing.sm,
        gap: t.spacing.xs,
        alignItems: "center",
    },
    indicator: {
        width: 56,
        height: 32,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    indicatorLayer: {
        ...StyleSheet.absoluteFill,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.primary,
        opacity: 0.16,
    },
    label: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    labelActive: {
        fontFamily: fontFamilies.bold,
        color: t.colors.primary,
    },
});
