import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, View, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme } from "../../hooks/theme/useTheme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.97;

type Props = Omit<PressableProps, "style" | "children"> & {
    style?: StyleProp<ViewStyle>;
    // Capa de presionado de Figma: aparece y desaparece con la animación.
    pressedStyle?: StyleProp<ViewStyle>;
    children?: ReactNode;
};

// Pressable con animación de toque (spec 010, CA-20 a CA-22). Solo usa onPressIn y onPressOut:
// onPress no espera a la animación (RN-4), y deshabilitado no recibe esos eventos (CA-21).
export default function PressableScale({ style, pressedStyle, children, onPressIn, onPressOut, disabled, ...props }: Props) {
    const { motion } = useTheme();
    const reduced = useReducedMotion();
    const progress = useRef(new Animated.Value(0)).current;

    function animate(toValue: number, duration: number) {
        Animated.timing(progress, { toValue, duration: reduced ? 0 : duration, useNativeDriver: true }).start();
    }

    // Si se deshabilita mientras está presionado (p. ej. "Iniciar"), no debe quedarse así.
    useEffect(() => {
        if (disabled) progress.setValue(0);
    }, [disabled, progress]);

    return (
        <AnimatedPressable
            {...props}
            disabled={disabled}
            onPressIn={(event: GestureResponderEvent) => {
                animate(1, motion.press);
                onPressIn?.(event);
            }}
            onPressOut={(event: GestureResponderEvent) => {
                animate(0, motion.release);
                onPressOut?.(event);
            }}
            style={[
                style,
                !reduced && {
                    transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, PRESSED_SCALE] }) }],
                },
            ]}
        >
            {pressedStyle && (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: progress }]}>
                    <View style={pressedStyle} />
                </Animated.View>
            )}
            {children}
        </AnimatedPressable>
    );
}
