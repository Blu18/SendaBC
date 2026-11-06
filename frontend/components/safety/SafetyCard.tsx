import { View, Text, StyleSheet } from "react-native";
import TextBtn from "../ui/buttons/TextBtn";
import Icon from "../ui/Icon";
import { AVISO_911, SAFETY_MESSAGES, textoSeguridadActiva } from "../../lib/safety/messages";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    // Nombres de los contactos activos; vacío si no hay a quién avisar.
    nombres: string[];
    onConfigurar: () => void;
};

// Estado de la seguridad antes de iniciar (spec 008, CA-8, CA-9): a quiénes se avisaría o, sin
// contactos activos, el aviso con el enlace a configurarlos. Se puede iniciar de todos modos.
// Diseño de Figma (spec 009): borde primary y escudo relleno si está activa; borde alert
// (seguridad, RN-5) y escudo de contorno si no hay contactos.
export default function SafetyCard({ nombres, onConfigurar }: Props) {
    const styles = useThemedStyles(makeStyles);
    const activa = nombres.length > 0;
    return (
        <View style={[styles.card, activa ? styles.active : styles.inactive]}>
            <View style={styles.status}>
                <Icon
                    name={activa ? "shield-check" : "shield-check-outline"}
                    color={activa ? "primary" : "alert"}
                    decorative
                />
                <Text style={styles.text}>
                    {activa ? textoSeguridadActiva(nombres) : SAFETY_MESSAGES.sinContactos}
                </Text>
            </View>
            {!activa && (
                <TextBtn
                    text={SAFETY_MESSAGES.configurar}
                    onPress={onConfigurar}
                    style={styles.link}
                    textStyle={styles.linkText}
                />
            )}
            <Text style={styles.disclaimer}>{AVISO_911}</Text>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    card: {
        alignSelf: 'stretch',
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        backgroundColor: t.colors.surface,
    },
    active: {
        borderColor: t.colors.primary,
    },
    inactive: {
        borderColor: t.colors.alert,
    },
    status: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: t.spacing.md,
    },
    text: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
        flex: 1,
    },
    // Enlace alineado al texto: sin relleno lateral, pero con los 48 dp de alto (CA-13).
    link: {
        alignSelf: 'flex-start',
        paddingHorizontal: 0,
    },
    linkText: {
        fontFamily: fontFamilies.bold,
        textDecorationLine: 'underline',
    },
    disclaimer: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
});
