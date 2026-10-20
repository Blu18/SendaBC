import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import type { RouteListStatus } from "../../lib/routes/status";
import { colors } from "../../lib/theme/colors";

type Messages = { empty: string; offline: string; error: string };

// Lo que muestran "Mis rutas" y "Mis favoritas" cuando no hay lista que pintar: cargando, sin
// conexión o error con "Reintentar", o el mensaje de lista vacía (spec 007, CA-18, CA-21).
// Con status 'success' no muestra nada.
export default function RouteListNotice({
    status,
    messages,
    onRetry,
}: {
    status: RouteListStatus;
    messages: Messages;
    onRetry: () => void;
}) {
    if (status === 'success') return null;
    if (status === 'loading') {
        return <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />;
    }
    return (
        <View style={styles.container}>
            <Text style={styles.text}>{messages[status]}</Text>
            {status !== 'empty' && <PrimaryButton text="Reintentar" style={styles.retry} onPress={onRetry} />}
        </View>
    );
}

const styles = StyleSheet.create({
    loading: {
        marginTop: 32,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 16,
    },
    text: {
        fontSize: 16,
        color: colors.text,
        textAlign: 'center',
    },
    retry: {
        paddingVertical: 12,
    },
});
