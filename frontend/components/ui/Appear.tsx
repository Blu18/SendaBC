import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme } from "../../hooks/theme/useTheme";

type Props = {
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
};

// Entrada y salida de un aviso, tarjeta o fila (spec 010, CA-25). Se usa alrededor de la condición:
// `<Appear>{error && <Notice ... />}</Appear>`. Cuando el contenido desaparece, sigue mostrando el
// último mientras sale, sin recibir toques. Con la opción de reducir animaciones solo cambia (CA-27).
export default function Appear({ children, style }: Props) {
    const { motion, spacing } = useTheme();
    const reduced = useReducedMotion();
    const present = Children.toArray(children).length > 0;
    const [mounted, setMounted] = useState(present);
    const last = useRef(children);
    const progress = useRef(new Animated.Value(0)).current;

    if (present) last.current = children;
    if (present && !mounted) setMounted(true);

    useEffect(() => {
        Animated.timing(progress, {
            toValue: present ? 1 : 0,
            duration: reduced ? 0 : motion.content,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished && !present) setMounted(false);
        });
    }, [present, reduced, motion.content, progress]);

    if (!present && !mounted) return null;

    const translateY = reduced ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [spacing.sm, 0] });

    return (
        <Animated.View
            pointerEvents={present ? "box-none" : "none"}
            style={[style, { opacity: progress, transform: [{ translateY }] }]}
        >
            {last.current}
        </Animated.View>
    );
}
