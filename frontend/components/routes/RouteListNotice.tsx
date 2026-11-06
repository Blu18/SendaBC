import { View, StyleSheet, ActivityIndicator } from "react-native";
import Appear from "../ui/Appear";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import Notice from "../ui/Notice";
import type { RouteListStatus } from "../../lib/routes/status";
import type { Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

type Messages = { empty: string; offline: string; error: string };

// Títulos de los avisos (spec 009, prototipo); el mensaje de cada lista va como descripción.
const TITLES = {
    empty: 'Nada por aquí todavía',
    offline: 'Sin conexión',
    error: 'No se pudo cargar',
} as const;

const TYPES = { empty: 'info', offline: 'offline', error: 'error' } as const;

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
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    if (status === 'success') return null;
    if (status === 'loading') {
        return <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />;
    }
    return (
        <View style={styles.container}>
            <Appear>
                <Notice type={TYPES[status]} title={TITLES[status]} description={messages[status]} />
            </Appear>
            {status !== 'empty' && <PrimaryButton text="Reintentar" onPress={onRetry} />}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    loading: {
        marginTop: t.spacing.xxl,
    },
    container: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
});
