import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { formatoCuentaRegresiva, textoPregunta } from "../../lib/safety/messages";
import { UMBRALES_APP } from "../../lib/safety/locationTask";
import { colors } from "../../lib/theme/colors";

type Props = {
    visible: boolean;
    restanteMs: number;
    respondiendo: boolean;
    onEstoyBien: () => void;
};

// "¿Estás bien?" a pantalla completa (spec 008, CA-11, CA-12). El botón es grande para tocarlo
// con guantes o con prisa (spec, accesibilidad). Usa el color de alerta, reservado a seguridad.
export default function AreYouOkModal({ visible, restanteMs, respondiendo, onEstoyBien }: Props) {
    const { titulo, cuerpo, boton } = textoPregunta(UMBRALES_APP);
    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
            <View style={styles.container}>
                <Text style={styles.title}>{titulo}</Text>
                <Text style={styles.body}>{cuerpo}</Text>
                <Text
                    style={styles.countdown}
                    accessibilityLabel={`Quedan ${formatoCuentaRegresiva(restanteMs)}`}
                >
                    {formatoCuentaRegresiva(restanteMs)}
                </Text>
                <Pressable
                    onPress={onEstoyBien}
                    disabled={respondiendo}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.button, (pressed || respondiendo) && styles.buttonPressed]}
                >
                    <Text style={styles.buttonText}>{boton}</Text>
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.alert,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 24,
    },
    title: {
        fontSize: 40,
        fontWeight: 'bold',
        color: colors.background,
        textAlign: 'center',
    },
    body: {
        fontSize: 18,
        color: colors.background,
        textAlign: 'center',
    },
    countdown: {
        fontSize: 72,
        fontWeight: 'bold',
        color: colors.background,
        fontVariant: ['tabular-nums'],
    },
    button: {
        alignSelf: 'stretch',
        minHeight: 140,
        borderRadius: 24,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.alert,
    },
});
