import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import BgBtn from "../ui/buttons/BgBtn";
import PrimaryButton from "../ui/buttons/PrimaryBtn";
import TextBtn from "../ui/buttons/TextBtn";
import Notice from "../ui/Notice";
import ReturnTimePicker from "./ReturnTimePicker";
import type { LocalSafetySession } from "../../lib/db/safety";
import type { ResultadoRegreso } from "../../lib/safety/sessionActions";
import { SAFETY_MESSAGES, textoAlertaEnviada, textoRegreso } from "../../lib/safety/messages";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type AlertProps = {
    sesion: LocalSafetySession;
    // A quiénes se entregó la alerta según el servidor o, mientras no responda, los contactos
    // activos: a ellos se envía (RN-12, CA-17).
    nombres: string[];
    onCancelarAlerta: () => void;
};

// Aviso de alerta activa con "Cancelar alerta" (spec 008, CA-17, CA-25). Va arriba de la
// grabación, sobre alert sólido (solo seguridad, RN-5), como en Figma (spec 009).
export function ActiveAlert({ sesion, nombres, onCancelarAlerta }: AlertProps) {
    const styles = useThemedStyles(makeStyles);
    if (!sesion.alertTriggeredAt) return null;

    const confirmarCancelar = () =>
        Alert.alert(SAFETY_MESSAGES.cancelarAlerta, SAFETY_MESSAGES.cancelarConfirmacion, [
            { text: SAFETY_MESSAGES.seguirGrabando, style: 'cancel' },
            { text: SAFETY_MESSAGES.cancelarAlerta, onPress: onCancelarAlerta },
        ]);

    return (
        <View style={styles.alert}>
            <Notice
                type="alert"
                title={SAFETY_MESSAGES.alertaTitulo}
                description={
                    sesion.alertServerId === null
                        ? SAFETY_MESSAGES.alertaPendiente
                        : textoAlertaEnviada(new Date(sesion.alertTriggeredAt).getTime(), nombres)
                }
            />
            <BgBtn text={SAFETY_MESSAGES.cancelarAlerta} onPress={confirmarCancelar} style={styles.cancel} />
        </View>
    );
}

type Props = {
    sesion: LocalSafetySession;
    onCambiarRegreso: (regreso: number | null) => Promise<ResultadoRegreso>;
};

// Hora de regreso durante la grabación (spec 008, T18): enviada o pendiente y su cambio (CA-19,
// CA-23). La alerta activa es ActiveAlert y el SOS (CA-24) está en la barra de abajo
// (SosButton, spec 009, CA-13).
export default function RecordingSafety({ sesion, onCambiarRegreso }: Props) {
    const styles = useThemedStyles(makeStyles);
    const regreso = sesion.returnBy ? new Date(sesion.returnBy).getTime() : null;
    const [editando, setEditando] = useState(false);
    const [borrador, setBorrador] = useState<number | null>(regreso);
    const [error, setError] = useState<string | null>(null);

    const editar = () => {
        setBorrador(regreso);
        setError(null);
        setEditando(true);
    };

    const guardar = async () => {
        try {
            const resultado = await onCambiarRegreso(borrador);
            if (resultado.kind === 'invalida') return setError(resultado.error);
            setEditando(false);
        } catch (e) {
            console.log('Error cambiando la hora de regreso:', e);
        }
    };

    if (editando) {
        return (
            <View style={styles.editing}>
                <ReturnTimePicker value={borrador} onChange={setBorrador} error={error} />
                <View style={styles.row}>
                    <TextBtn text={SAFETY_MESSAGES.cancelar} onPress={() => setEditando(false)} style={styles.flex} />
                    <PrimaryButton text={SAFETY_MESSAGES.guardarRegreso} onPress={() => void guardar()} style={styles.flex} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.box, styles.row]}>
            <View style={styles.texts}>
                <Text style={styles.returnValue}>
                    {regreso === null ? SAFETY_MESSAGES.sinRegreso : textoRegreso(regreso)}
                </Text>
                {regreso !== null && (
                    <Text style={sesion.serverAck ? styles.sent : styles.pending}>
                        {sesion.serverAck ? SAFETY_MESSAGES.regresoEnviado : SAFETY_MESSAGES.regresoPendiente}
                    </Text>
                )}
            </View>
            <TextBtn text={SAFETY_MESSAGES.cambiarRegreso} onPress={editar} />
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    alert: {
        alignSelf: 'stretch',
        gap: t.spacing.sm,
    },
    // Va sobre el mapa: sin fondo, el texto no se leería (spec 010, RN-7).
    cancel: {
        backgroundColor: t.colors.surface,
    },
    editing: {
        alignSelf: 'stretch',
        gap: t.spacing.sm,
    },
    box: {
        alignSelf: 'stretch',
        paddingLeft: t.spacing.lg,
        paddingRight: t.spacing.xs,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
    },
    flex: {
        flex: 1,
    },
    texts: {
        flex: 1,
        gap: t.spacing.xxs,
    },
    returnValue: {
        ...t.typography.body,
        fontFamily: fontFamilies.bold,
        color: t.colors.text,
    },
    sent: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    // Pendiente en ocre de texto, que llega a 4.5:1 (RN-4).
    pending: {
        ...t.typography.caption,
        color: t.colors.secondaryText,
    },
});
