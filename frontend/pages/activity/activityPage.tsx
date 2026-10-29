import { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, Alert, Vibration } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import BgBtn from "../../components/ui/buttons/BgBtn";
import { useActivityTracker } from "../../hooks/activity/activityTracker.hook";
import { useEmergencyContacts } from "../../hooks/safety/useEmergencyContacts";
import { useAreYouOk } from "../../hooks/safety/useAreYouOk";
import { useSafetySession } from "../../hooks/safety/useSafetySession";
import { useAuth } from "../../context/AuthContext";
import AreYouOkModal from "../../components/safety/AreYouOkModal";
import SafetyCard from "../../components/safety/SafetyCard";
import ReturnTimePicker from "../../components/safety/ReturnTimePicker";
import RecordingSafety from "../../components/safety/RecordingSafety";
import type { ActivityType } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { contactosActivos } from "../../lib/safety/contacts";
import { SAFETY_MESSAGES, textoTerminarSinRed } from "../../lib/safety/messages";
import { sessionActions } from "../../lib/safety";
import { isOnline } from "../../lib/sync";
import { pedirPermisoNotificaciones } from "../../lib/safety/notifications";
import { colors } from "../../lib/theme/colors";

const TIPOS = (Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((value) => ({
    value,
    label: ACTIVITY_TYPE_LABELS[value],
}));

// Antes de pedir el permiso en segundo plano se explica para qué es; en Android 11 o más abre los
// ajustes, donde hay que elegir "Permitir todo el tiempo" (spec 008, CA-10).
function explicarSegundoPlano() {
    return new Promise<boolean>((resolve) =>
        Alert.alert(SAFETY_MESSAGES.permisoTitulo, SAFETY_MESSAGES.permisoExplicacion, [
            { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continuar', onPress: () => resolve(true) },
        ], { cancelable: true, onDismiss: () => resolve(false) })
    );
}

// Al detener con una alerta activa se pregunta si se cancela antes (CA-26).
type DecisionAlerta = 'cancelar' | 'mantener' | 'seguir';
function preguntarPorAlerta() {
    return new Promise<DecisionAlerta>((resolve) =>
        Alert.alert(SAFETY_MESSAGES.terminarConAlertaTitulo, SAFETY_MESSAGES.terminarConAlertaPregunta, [
            { text: SAFETY_MESSAGES.seguirGrabando, style: 'cancel', onPress: () => resolve('seguir') },
            { text: SAFETY_MESSAGES.terminarSinCancelar, onPress: () => resolve('mantener') },
            { text: SAFETY_MESSAGES.terminarCancelando, onPress: () => resolve('cancelar') },
        ], { cancelable: true, onDismiss: () => resolve('seguir') })
    );
}

// Aviso de CA-21: se termina sin conexión con hora de regreso.
function avisarSinRed(regreso: number) {
    return new Promise<void>((resolve) =>
        Alert.alert(SAFETY_MESSAGES.sinRedTitulo, textoTerminarSinRed(regreso), [
            { text: 'Entendido', onPress: () => resolve() },
        ], { cancelable: true, onDismiss: () => resolve() })
    );
}

// Segundos desde startedAt, actualizados cada segundo mientras se graba (CA-5)
function useElapsedSeconds(startedAt: string | null, running: boolean) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!running) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [running]);

    if (!startedAt) return 0;
    return (now - new Date(startedAt).getTime()) / 1000;
}

export default function ActivityPage() {
    const [type, setType] = useState<ActivityType>('HIKING'); // por defecto Senderismo (CA-1)
    // Navegación del stack raíz: replace solo existe en stacks
    const navigation = useNavigation<NativeStackNavigationProp<ReactNavigation.RootParamList>>();
    const {
        status,
        mode,
        activityLocalId,
        pointCount,
        startedAt,
        permissionError,
        stopFailed,
        liveDistance,
        liveElevationGain,
        start,
        stop,
    } = useActivityTracker();
    const recording = status === 'recording';
    // Con contactos activos hay a quién avisar: vale la pena pedir el permiso en segundo plano
    // (spec 008, CA-10). Sin red se usa la copia del teléfono.
    const { contacts, status: contactsStatus } = useEmergencyContacts();
    const nombresActivos = contactosActivos(contacts).map((c) => c.name);
    const hayContactos = nombresActivos.length > 0;
    const { userId } = useAuth();
    // Hora de regreso elegida antes de iniciar (CA-8); durante la grabación vive en la sesión.
    const [regreso, setRegreso] = useState<number | null>(null);
    const seguridad = useSafetySession(activityLocalId, recording);

    // Sin permiso de notificaciones, "¿Estás bien?" solo se ve con la app abierta (plan, riesgos).
    const [sinNotificaciones, setSinNotificaciones] = useState(false);
    const pregunta = useAreYouOk(activityLocalId, recording);

    const handleStart = async () => {
        if (!hayContactos) return start(type);
        // Se pide junto con el de ubicación (plan): también muestra la notificación del servicio
        // que graba con la pantalla bloqueada (Android 13+).
        setSinNotificaciones(!(await pedirPermisoNotificaciones()));
        // La sesión de seguridad se crea con la actividad y se encola para el servidor (T18).
        return start(type, {
            explicarSegundoPlano,
            alCrear: (localId) => sessionActions.iniciar(localId, userId!, regreso),
        });
    };
    const elapsed = useElapsedSeconds(startedAt, recording);

    // Al detener se abre el resumen. replace saca esta pantalla del stack, así que
    // "Listo" y el botón atrás del resumen regresan a la pantalla principal (spec 004, CA-1, CA-2)
    const handleStop = async () => {
        try {
            const sesion = seguridad.sesion;
            if (seguridad.alertaActiva) {
                const decision = await preguntarPorAlerta();
                if (decision === 'seguir') return;
                if (decision === 'cancelar') await seguridad.cancelarAlerta();
            }
            const localId = await stop();
            // Sin conexión, el fin de la sesión espera en la bandeja: si no sale antes de la hora
            // de regreso más el margen, el servidor avisará (CA-21).
            if (localId !== null && sesion?.returnBy && !(await isOnline())) {
                await avisarSinRed(new Date(sesion.returnBy).getTime());
            }
            if (localId !== null) {
                navigation.replace('ActivitySummary', { localId, origin: 'recording' });
            }
        } catch (e) {
            console.log('Error deteniendo la actividad:', e);
        }
    };

    // SOS (CA-24): con una alerta activa no se envía otra (CA-27).
    const handleSos = async () => {
        try {
            const resultado = await seguridad.pedirAyuda();
            if (resultado.kind === 'ya-activa') Alert.alert(SAFETY_MESSAGES.alertaTitulo, SAFETY_MESSAGES.sosYaActiva);
            if (resultado.kind === 'creada') Vibration.vibrate(500);
        } catch (e) {
            console.log('Error pidiendo ayuda:', e);
        }
    };

    const handleCancelarAlerta = async () => {
        try {
            await seguridad.cancelarAlerta();
        } catch (e) {
            console.log('Error cancelando la alerta:', e);
        }
    };

    return (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
            <Text style={styles.title}>Actividad</Text>

            <View style={styles.selector}>
                {TIPOS.map((tipo) => {
                    const selected = tipo.value === type;
                    return (
                        <Pressable
                            key={tipo.value}
                            disabled={recording}
                            onPress={() => setType(tipo.value)}
                            style={[
                                styles.option,
                                selected && styles.optionSelected,
                                recording && !selected && styles.optionDisabled,
                            ]}
                        >
                            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                {tipo.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Métricas en vivo: mismos umbrales que el resumen (spec 004, CA-15, CA-16) */}
            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatDuration(elapsed)}</Text>
                    <Text style={styles.statLabel}>Tiempo</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatDistance(liveDistance)}</Text>
                    <Text style={styles.statLabel}>Distancia</Text>
                </View>
            </View>
            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatElevation(liveElevationGain)}</Text>
                    <Text style={styles.statLabel}>Elevación ganada</Text>
                </View>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{pointCount}</Text>
                    <Text style={styles.statLabel}>Puntos</Text>
                </View>
            </View>

            {/* Antes de iniciar: a quiénes se avisaría y la hora de regreso (CA-8, CA-9) */}
            {!recording && !stopFailed && (
                <>
                    {/* Mientras cargan no se muestra el aviso sin contactos */}
                    {contactsStatus !== 'loading' && (
                        <SafetyCard
                            nombres={nombresActivos}
                            onConfigurar={() => navigation.navigate('EmergencyContacts')}
                        />
                    )}
                    {hayContactos && <ReturnTimePicker value={regreso} onChange={setRegreso} />}
                </>
            )}

            {/* Durante la grabación: hora de regreso, alerta activa y SOS (CA-17, CA-23 a CA-25) */}
            {recording && seguridad.sesion && (
                <RecordingSafety
                    sesion={seguridad.sesion}
                    alertaActiva={seguridad.alertaActiva}
                    nombres={nombresActivos}
                    onCambiarRegreso={seguridad.cambiarRegreso}
                    onPedirAyuda={() => void handleSos()}
                    onCancelarAlerta={() => void handleCancelarAlerta()}
                />
            )}

            {permissionError && (
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>
                        {permissionError === 'blocked'
                            ? 'El permiso de ubicación está desactivado. Actívalo en los ajustes de la app para registrar tu actividad.'
                            : 'SendaBC necesita tu ubicación para registrar el recorrido. Presiona "Iniciar actividad" y permite el acceso.'}
                    </Text>
                    {permissionError === 'blocked' && (
                        <BgBtn text="Abrir ajustes" onPress={() => Linking.openSettings()} />
                    )}
                </View>
            )}

            {/* Sin el permiso en segundo plano, la detección solo corre con la app abierta (CA-10) */}
            {recording && mode === 'foreground' && hayContactos && (
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>{SAFETY_MESSAGES.sinPermiso}</Text>
                </View>
            )}

            {recording && hayContactos && sinNotificaciones && (
                <View style={styles.notice}>
                    <Text style={styles.noticeText}>{SAFETY_MESSAGES.sinNotificaciones}</Text>
                </View>
            )}

            {/* "¿Estás bien?" (spec 008, CA-11, CA-12) */}
            <AreYouOkModal
                visible={pregunta.visible}
                restanteMs={pregunta.restanteMs}
                respondiendo={pregunta.respondiendo}
                onEstoyBien={() => void pregunta.estoyBien()}
            />

            {/* No se pudo cerrar la actividad al detener: no se ofrece iniciar otra mientras
                quede una sin cerrar (spec 003, CA-12, RN-1) */}
            {stopFailed ? (
                <>
                    <View style={styles.notice}>
                        <Text style={styles.noticeText}>
                            No se pudo cerrar la actividad. Se completará automáticamente al volver a abrir la app.
                        </Text>
                    </View>
                    <PrimaryButton text="Volver" onPress={() => navigation.goBack()} style={styles.mainBtn} />
                </>
            ) : (
                <PrimaryButton
                    text={recording ? 'Detener actividad' : 'Iniciar actividad'}
                    onPress={recording ? handleStop : handleStart}
                    style={[styles.mainBtn, recording && styles.stopBtn]}
                />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    selector: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        gap: 8,
    },
    option: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
    },
    optionSelected: {
        backgroundColor: colors.primary,
    },
    optionDisabled: {
        opacity: 0.4,
    },
    optionText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    optionTextSelected: {
        color: colors.background,
    },
    stats: {
        flexDirection: 'row',
        alignSelf: 'stretch',
        justifyContent: 'space-around',
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.data,
        fontVariant: ['tabular-nums'],
    },
    statLabel: {
        fontSize: 14,
        color: colors.textMuted,
    },
    mainBtn: {
        paddingVertical: 14,
    },
    notice: {
        alignSelf: 'stretch',
        gap: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.secondary,
    },
    noticeText: {
        color: colors.text,
        fontSize: 15,
    },
    stopBtn: {
        backgroundColor: colors.text, // Roca sombra: Alerta queda reservada a seguridad
    },
});
