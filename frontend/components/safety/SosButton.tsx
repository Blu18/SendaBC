import { Text, View, StyleSheet } from "react-native";
import Icon from "../ui/Icon";
import PressableScale from "../ui/PressableScale";
import { SAFETY_MESSAGES } from "../../lib/safety/messages";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// Mantener presionado 2 s para pedir ayuda: evita un toque accidental (spec 008, RN-7).
const SOS_MS = 2000;

// "Pedir ayuda" (spec 008, CA-24) en la barra de abajo de la grabación, al alcance del pulgar
// (spec 009, CA-13). Va en alert con onAlert: es del módulo de seguridad (RN-5).
export default function SosButton({ onPedirAyuda }: { onPedirAyuda: () => void }) {
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.container}>
            <PressableScale
                delayLongPress={SOS_MS}
                onLongPress={onPedirAyuda}
                accessibilityRole="button"
                accessibilityHint={SAFETY_MESSAGES.sosInstruccion}
                style={styles.sos}
                pressedStyle={styles.holding}
            >
                <Icon name="shield-check" color="onAlert" decorative />
                <Text style={styles.sosText}>{SAFETY_MESSAGES.sos}</Text>
            </PressableScale>
            <Text style={styles.hint}>{SAFETY_MESSAGES.sosInstruccion}</Text>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        gap: t.spacing.sm,
    },
    sos: {
        minHeight: t.touchMin,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.md,
        backgroundColor: t.colors.alert,
        overflow: "hidden",
    },
    // Mientras se mantiene presionado, la misma capa del 16 % que los botones rellenos.
    holding: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.text,
        opacity: 0.16,
    },
    sosText: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.onAlert,
    },
    hint: {
        ...t.typography.caption,
        color: t.colors.textMuted,
        textAlign: "center",
    },
});
