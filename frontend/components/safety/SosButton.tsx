import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Icon from "../ui/Icon";
import PressableScale from "../ui/PressableScale";
import { SAFETY_MESSAGES } from "../../lib/safety/messages";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// Mantener presionado 2 s para pedir ayuda: evita un toque accidental (spec 008, RN-7).
const SOS_MS = 2000;

type Props = {
    onPedirAyuda: () => void;
    // Un toque corto no pide ayuda: muestra la instrucción, que aquí ya no cabe (spec 011, CA-38).
    onToqueCorto: () => void;
    style?: StyleProp<ViewStyle>;
};

// "Pedir ayuda" (spec 008, CA-24) flotando sobre el mapa, del tamaño del botón 3D/2D (spec 011,
// CA-30). Va en alert con onAlert: es del módulo de seguridad (spec 009, RN-5).
export default function SosButton({ onPedirAyuda, onToqueCorto, style }: Props) {
    const styles = useThemedStyles(makeStyles);

    return (
        <PressableScale
            delayLongPress={SOS_MS}
            onLongPress={onPedirAyuda}
            onPress={onToqueCorto}
            accessibilityRole="button"
            accessibilityLabel={SAFETY_MESSAGES.sos}
            accessibilityHint={SAFETY_MESSAGES.sosInstruccion}
            style={[styles.sos, style]}
            pressedStyle={styles.holding}
        >
            <Icon name="shield-check" color="onAlert" decorative />
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    sos: {
        width: t.touchMin,
        height: t.touchMin,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.colors.alert,
        ...t.shadows.floating,
    },
    // Mientras se mantiene presionado, la misma capa del 16 % que los botones rellenos.
    holding: {
        ...StyleSheet.absoluteFill,
        borderRadius: t.radius.pill,
        backgroundColor: t.colors.text,
        opacity: 0.16,
    },
});
