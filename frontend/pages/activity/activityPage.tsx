import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Linking, Alert, Vibration } from "react-native";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import BgBtn from "../../components/ui/buttons/BgBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import Chip from "../../components/ui/Chip";
import Metric from "../../components/ui/Metric";
import { useActivityTracker } from "../../hooks/activity/activityTracker.hook";
import { useEmergencyContacts } from "../../hooks/safety/useEmergencyContacts";
import { useAreYouOk } from "../../hooks/safety/useAreYouOk";
import { useSafetySession } from "../../hooks/safety/useSafetySession";
import { useAuth } from "../../context/AuthContext";
import MapErrorBoundary from "../../components/map/MapErrorBoundary";
import RecordingMap from "../../components/map/RecordingMap";
import AreYouOkModal from "../../components/safety/AreYouOkModal";
import SafetyCard from "../../components/safety/SafetyCard";
import ReturnTimePicker from "../../components/safety/ReturnTimePicker";
import RecordingSafety, { ActiveAlert } from "../../components/safety/RecordingSafety";
import SosButton from "../../components/safety/SosButton";
import StopButton from "../../components/activity/StopButton";
import type { ActivityType } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { contactosActivos } from "../../lib/safety/contacts";
import { SAFETY_MESSAGES, textoTerminarSinRed } from "../../lib/safety/messages";
import { sessionActions } from "../../lib/safety";
import { isOnline } from "../../lib/sync";
import { pedirPermisoNotificaciones } from "../../lib/safety/notifications";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

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

// Si el sistema ya no deja pedir el permiso en segundo plano, se avisa antes de iniciar y se
// ofrecen los ajustes (spec 008, CA-10; spec 011, F2). true = grabar así.
function avisarSinPermisoSegundoPlano() {
    return new Promise<boolean>((resolve) =>
        Alert.alert(SAFETY_MESSAGES.sinPermisoTitulo, SAFETY_MESSAGES.sinPermisoAntes, [
            { text: SAFETY_MESSAGES.grabarAsi, style: 'cancel', onPress: () => resolve(true) },
            {
                text: SAFETY_MESSAGES.abrirAjustes,
                onPress: () => {
                    void Linking.openSettings();
                    resolve(false);
                },
            },
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

// Cuánto se ve la instrucción de "Pedir ayuda" tras un toque corto (spec 011, CA-38).
const SOS_INSTRUCCION_MS = 3000;

function useSosInstruccion() {
    const [visible, setVisible] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    const mostrar = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        setVisible(true);
        timer.current = setTimeout(() => setVisible(false), SOS_INSTRUCCION_MS);
    }, []);

    return { visible, mostrar };
}

export default function ActivityPage() {
    const [type, setType] = useState<ActivityType>('HIKING'); // por defecto Senderismo (CA-1)
    const styles = useThemedStyles(makeStyles);
    const sosInstruccion = useSosInstruccion();
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
        startFailed,
        liveDistance,
        liveElevationGain,
        start,
        stop,
    } = useActivityTracker();
    const recording = status === 'recording';

    // Salir termina la actividad y no se puede reanudar: se pregunta antes (spec 003, CA-15). No se
    // pregunta en lo que no decidió el usuario aquí: replace al detener y reset si la sesión venció.
    usePreventRemove(recording, ({ data }) => {
        const salir = () => navigation.dispatch(data.action);
        if (data.action.type === 'REPLACE' || data.action.type === 'RESET') return salir();
        Alert.alert('¿Terminar la actividad?', 'Si sales, la grabación termina y no se puede reanudar. Lo grabado queda guardado.', [
            { text: 'Seguir grabando', style: 'cancel' },
            { text: 'Terminar', style: 'destructive', onPress: salir },
        ]);
    });

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

    // start() atrapa sus errores y los muestra con startFailed (spec 003, CA-16).
    const handleStart = async () => {
        try {
            if (!hayContactos) return await start(type);
            // Se pide junto con el de ubicación (plan): también muestra la notificación del servicio
            // que graba con la pantalla bloqueada (Android 13+).
            setSinNotificaciones(!(await pedirPermisoNotificaciones()));
            // La sesión de seguridad se crea con la actividad y se encola para el servidor (T18).
            await start(type, {
                explicarSegundoPlano,
                avisarSinPermisoSegundoPlano,
                alCrear: (localId) => sessionActions.iniciar(localId, userId!, regreso),
            });
        } catch (e) {
            console.log('Error iniciando la actividad:', e);
        }
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

    const alertaActiva = seguridad.sesion && seguridad.alertaActiva ? (
        <ActiveAlert
            sesion={seguridad.sesion}
            nombres={seguridad.entregadaA ?? nombresActivos}
            onCancelarAlerta={() => void handleCancelarAlerta()}
        />
    ) : undefined;

    // Lo que va arriba del mapa, y sigue visible aunque el mapa falle.
    const avisosMapa = alertaActiva || sosInstruccion.visible ? (
        <View style={styles.avisosMapa}>
            {alertaActiva}
            {sosInstruccion.visible && (
                <Notice title={SAFETY_MESSAGES.sos} description={SAFETY_MESSAGES.sosInstruccion} />
            )}
        </View>
    ) : undefined;

    const titulo = recording ? `Grabando · ${ACTIVITY_TYPE_LABELS[type]}` : 'Nueva actividad';

    return (
        <View style={styles.screen}>
            <ScreenHeader title={titulo} onBack={() => navigation.goBack()} />
            {/* Mapa arriba y panel abajo (spec 010, CA-6). La alerta activa va sobre el mapa, con
                "Cancelar alerta", para no empujar las métricas (spec 008, CA-17, CA-25) */}
            {recording && (
                <View style={styles.mapa}>
                    <MapErrorBoundary overlay={avisosMapa}>
                        <RecordingMap activityLocalId={activityLocalId} overlay={avisosMapa} />
                    </MapErrorBoundary>
                    {/* Fuera de MapErrorBoundary: siguen ahí aunque el mapa falle (spec 011, CA-37) */}
                    <View style={styles.flotantes} pointerEvents="box-none">
                        <StopButton onPress={() => void handleStop()} />
                        {seguridad.sesion && (
                            <SosButton
                                onPedirAyuda={() => void handleSos()}
                                onToqueCorto={sosInstruccion.mostrar}
                                style={styles.sos}
                            />
                        )}
                    </View>
                </View>
            )}
            <ScrollView style={recording && styles.panel} contentContainerStyle={styles.content}>
                {/* El tipo ya sale en el título mientras se graba (spec 010, T13) */}
                {!recording && (
                    <View style={styles.selector}>
                        {TIPOS.map((tipo) => (
                            <Chip
                                key={tipo.value}
                                text={tipo.label}
                                selected={tipo.value === type}
                                onPress={() => setType(tipo.value)}
                            />
                        ))}
                    </View>
                )}

                {/* Métricas en vivo, los textos más grandes de la pantalla (spec 009, CA-12); mismos
                    umbrales que el resumen (spec 004, CA-15, CA-16) */}
                <Metric value={formatDuration(elapsed)} label="Tiempo" />
                <View style={styles.row}>
                    <Metric value={formatDistance(liveDistance)} label="Distancia" style={styles.flex} />
                    <Metric value={formatElevation(liveElevationGain)} label="Elevación ganada" style={styles.flex} />
                </View>
                <Text style={styles.points}>
                    {pointCount} {pointCount === 1 ? 'punto registrado' : 'puntos registrados'}
                </Text>

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

                {/* Durante la grabación: hora de regreso (CA-19, CA-23) */}
                {recording && seguridad.sesion && (
                    <RecordingSafety sesion={seguridad.sesion} onCambiarRegreso={seguridad.cambiarRegreso} />
                )}

                <Appear style={styles.group}>
                    {permissionError === 'blocked' && (
                        <>
                            <Notice
                                type="error"
                                title="Ubicación desactivada"
                                description="El permiso de ubicación está desactivado. Actívalo en los ajustes de la app para registrar tu actividad."
                            />
                            <BgBtn text="Abrir ajustes" onPress={() => Linking.openSettings()} />
                        </>
                    )}
                </Appear>
                <Appear>
                    {permissionError && permissionError !== 'blocked' && (
                        <Notice
                            title="Se necesita tu ubicación"
                            description={'SendaBC necesita tu ubicación para registrar el recorrido. Presiona "Iniciar actividad" y permite el acceso.'}
                        />
                    )}
                </Appear>

                {/* Sin el permiso en segundo plano, la detección solo corre con la app abierta (CA-10) */}
                <Appear>
                    {recording && mode === 'foreground' && hayContactos && (
                        <Notice title="Detección solo con la app abierta" description={SAFETY_MESSAGES.sinPermiso} />
                    )}
                </Appear>

                <Appear>
                    {recording && hayContactos && sinNotificaciones && (
                        <Notice title="Sin notificaciones" description={SAFETY_MESSAGES.sinNotificaciones} />
                    )}
                </Appear>

                {/* No se pudo iniciar: "Iniciar actividad" sigue abajo para reintentar (spec 003, CA-16) */}
                <Appear>
                    {startFailed && !recording && (
                        <Notice
                            type="error"
                            title="No se pudo iniciar la actividad"
                            description="Intenta de nuevo."
                        />
                    )}
                </Appear>

                {/* No se pudo cerrar la actividad al detener (spec 003, CA-12, RN-1) */}
                <Appear>
                    {stopFailed && (
                        <Notice
                            type="error"
                            title="No se pudo cerrar la actividad"
                            description="Se completará automáticamente al volver a abrir la app."
                        />
                    )}
                </Appear>
            </ScrollView>

            {/* Abajo, al alcance del pulgar (spec 009, CA-13). Al grabar, los controles flotan sobre
                el mapa (spec 011, CA-40) */}
            {!recording && (
                <View style={styles.actions}>
                    {/* Con una actividad sin cerrar no se ofrece iniciar otra (spec 003, CA-12, RN-1) */}
                    {stopFailed ? (
                        <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
                    ) : (
                        <PrimaryButton text="Iniciar actividad" onPress={handleStart} />
                    )}
                </View>
            )}

            {/* "¿Estás bien?" (spec 008, CA-11, CA-12) */}
            <AreYouOkModal
                visible={pregunta.visible}
                restanteMs={pregunta.restanteMs}
                respondiendo={pregunta.respondiendo}
                umbrales={pregunta.umbrales}
                onEstoyBien={() => void pregunta.estoyBien()}
            />
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    // Alto máximo del panel bajo el mapa (spec 010, T1).
    panel: {
        flexGrow: 0,
        maxHeight: 280,
    },
    group: {
        gap: t.spacing.md,
    },
    avisosMapa: {
        gap: t.spacing.md,
    },
    mapa: {
        flex: 1,
    },
    // "Detener" al centro y "Pedir ayuda" a la derecha, en la misma fila (spec 011, CA-30, CA-35).
    flotantes: {
        position: 'absolute',
        left: t.spacing.lg,
        right: t.spacing.lg,
        bottom: t.spacing.md,
        alignItems: 'center',
    },
    sos: {
        position: 'absolute',
        right: 0,
        bottom: 0,
    },
    content: {
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    selector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: t.spacing.sm,
    },
    row: {
        flexDirection: 'row',
        gap: t.spacing.lg,
    },
    flex: {
        flex: 1,
    },
    points: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    actions: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surface,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
});
