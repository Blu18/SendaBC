import { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import BgBtn from "../ui/buttons/BgBtn";
import ReturnTimePicker from "./ReturnTimePicker";
import type { LocalSafetySession } from "../../lib/db/safety";
import type { ResultadoRegreso } from "../../lib/safety/sessionActions";
import { SAFETY_MESSAGES, textoAlertaEnviada, textoRegreso } from "../../lib/safety/messages";
import { colors } from "../../lib/theme/colors";

type Props = {
    sesion: LocalSafetySession;
    alertaActiva: boolean;
    // A quiénes se entregó la alerta según el servidor o, mientras no responda, los contactos
    // activos: a ellos se envía (RN-12, CA-17).
    nombres: string[];
    onCambiarRegreso: (regreso: number | null) => Promise<ResultadoRegreso>;
    onCancelarAlerta: () => void;
};

// Seguridad durante la grabación (spec 008, T18): hora de regreso enviada o pendiente y su cambio
// (CA-19, CA-23) y el aviso de alerta activa con "Cancelar alerta" (CA-17, CA-25). El SOS (CA-24)
// está en la barra de abajo de la grabación (SosButton, spec 009, CA-13).
export default function RecordingSafety({
    sesion,
    alertaActiva,
    nombres,
    onCambiarRegreso,
    onCancelarAlerta,
}: Props) {
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

    const confirmarCancelar = () =>
        Alert.alert(SAFETY_MESSAGES.cancelarAlerta, SAFETY_MESSAGES.cancelarConfirmacion, [
            { text: SAFETY_MESSAGES.seguirGrabando, style: 'cancel' },
            { text: SAFETY_MESSAGES.cancelarAlerta, onPress: onCancelarAlerta },
        ]);

    return (
        <View style={styles.container}>
            {alertaActiva && sesion.alertTriggeredAt && (
                <View style={styles.alert}>
                    <Text style={styles.alertTitle}>{SAFETY_MESSAGES.alertaTitulo}</Text>
                    <Text style={styles.alertText}>
                        {sesion.alertServerId === null
                            ? SAFETY_MESSAGES.alertaPendiente
                            : textoAlertaEnviada(new Date(sesion.alertTriggeredAt).getTime(), nombres)}
                    </Text>
                    <BgBtn text={SAFETY_MESSAGES.cancelarAlerta} onPress={confirmarCancelar} />
                </View>
            )}

            {editando ? (
                <View style={styles.box}>
                    <ReturnTimePicker value={borrador} onChange={setBorrador} error={error} />
                    <View style={styles.row}>
                        <BgBtn text={SAFETY_MESSAGES.cancelar} onPress={() => setEditando(false)} style={styles.flex} />
                        <BgBtn text={SAFETY_MESSAGES.guardarRegreso} onPress={() => void guardar()} style={styles.flex} />
                    </View>
                </View>
            ) : (
                <View style={[styles.box, styles.row]}>
                    <View style={styles.flex}>
                        <Text style={styles.returnValue}>
                            {regreso === null ? SAFETY_MESSAGES.sinRegreso : textoRegreso(regreso)}
                        </Text>
                        {regreso !== null && (
                            <Text style={sesion.serverAck ? styles.sent : styles.pending}>
                                {sesion.serverAck ? SAFETY_MESSAGES.regresoEnviado : SAFETY_MESSAGES.regresoPendiente}
                            </Text>
                        )}
                    </View>
                    <BgBtn text={SAFETY_MESSAGES.cambiarRegreso} onPress={editar} style={styles.changeBtn} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'stretch',
        gap: 12,
    },
    box: {
        gap: 12,
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    flex: {
        flex: 1,
    },
    changeBtn: {
        alignSelf: 'center',
        paddingHorizontal: 16,
    },
    returnValue: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    sent: {
        color: colors.primary,
        fontSize: 13,
    },
    pending: {
        color: colors.secondary,
        fontSize: 13,
    },
    alert: {
        gap: 8,
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.alert,
    },
    alertTitle: {
        color: colors.background,
        fontSize: 18,
        fontWeight: 'bold',
    },
    alertText: {
        color: colors.background,
        fontSize: 15,
    },
});
