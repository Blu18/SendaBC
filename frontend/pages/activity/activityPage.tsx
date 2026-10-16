import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import BgBtn from "../../components/ui/buttons/BgBtn";
import { useActivityTracker } from "../../hooks/activity/activityTracker.hook";
import type { ActivityType } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS } from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance, formatElevation } from "../../lib/format/metrics";
import { colors } from "../../lib/theme/colors";

const TIPOS = (Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]).map((value) => ({
    value,
    label: ACTIVITY_TYPE_LABELS[value],
}));

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
    const elapsed = useElapsedSeconds(startedAt, recording);

    // Al detener se abre el resumen. replace saca esta pantalla del stack, así que
    // "Listo" y el botón atrás del resumen regresan a la pantalla principal (spec 004, CA-1, CA-2)
    const handleStop = async () => {
        try {
            const localId = await stop();
            if (localId !== null) {
                navigation.replace('ActivitySummary', { localId, origin: 'recording' });
            }
        } catch (e) {
            console.log('Error deteniendo la actividad:', e);
        }
    };

    return (
        <View style={styles.container}>
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
                    onPress={recording ? handleStop : () => start(type)}
                    style={[styles.mainBtn, recording && styles.stopBtn]}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 24,
        backgroundColor: colors.background,
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
