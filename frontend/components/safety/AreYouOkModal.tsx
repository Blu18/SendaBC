import { Modal, View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import Icon from "../ui/Icon";
import { formatoCuentaRegresiva, textoPregunta } from "../../lib/safety/messages";
import { UMBRALES_APP } from "../../lib/safety/locationTask";
import { lightColors, type Theme } from "../../lib/theme";
import { useReducedMotion } from "../../hooks/theme/useReducedMotion";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    visible: boolean;
    restanteMs: number;
    respondiendo: boolean;
    onEstoyBien: () => void;
};

// "¿Estás bien?" (spec 008, CA-11, CA-12) como hoja inferior sobre la grabación, como en Figma
// (spec 009): la cuenta regresiva grande en alert (solo seguridad, RN-5) y "Estoy bien" de 64 dp
// en la mitad inferior, al alcance del pulgar (CA-13).
export default function AreYouOkModal({ visible, restanteMs, respondiendo, onEstoyBien }: Props) {
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();
    const reduced = useReducedMotion();
    const { titulo, cuerpo, boton } = textoPregunta(UMBRALES_APP);
    return (
        <Modal
            visible={visible}
            transparent
            animationType={reduced ? "none" : "slide"}
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => {}}
        >
            <View style={styles.screen}>
                <View style={styles.scrim} />
                <View style={[styles.sheet, { paddingBottom: theme.spacing.xl + insets.bottom }]}>
                    <View style={styles.icon}>
                        <Icon name="exclamation-thick" size={32} color="onAlert" decorative />
                    </View>
                    <Text style={styles.title} accessibilityRole="header">{titulo}</Text>
                    <Text style={styles.body}>{cuerpo}</Text>
                    <Text
                        style={styles.countdown}
                        accessibilityLabel={`Quedan ${formatoCuentaRegresiva(restanteMs)}`}
                    >
                        {formatoCuentaRegresiva(restanteMs)}
                    </Text>
                    <PrimaryButton
                        text={boton}
                        onPress={onEstoyBien}
                        disabled={respondiendo}
                        style={styles.button}
                    />
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    // Oscurece la grabación igual en los dos modos (en oscuro, text es claro y la aclararía).
    scrim: {
        ...StyleSheet.absoluteFill,
        backgroundColor: lightColors.text,
        opacity: 0.5,
    },
    sheet: {
        alignItems: 'center',
        gap: t.spacing.md,
        padding: t.spacing.xl,
        borderTopLeftRadius: t.radius.lg,
        borderTopRightRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
    },
    icon: {
        width: 56,
        height: 56,
        borderRadius: t.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.alert,
    },
    title: {
        ...t.typography.display,
        color: t.colors.text,
        textAlign: 'center',
    },
    body: {
        ...t.typography.body,
        color: t.colors.text,
        textAlign: 'center',
    },
    countdown: {
        ...t.typography.metric,
        color: t.colors.alert,
    },
    button: {
        minHeight: 64,
    },
});
