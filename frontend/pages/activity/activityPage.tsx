import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import BgBtn from "../../components/ui/buttons/BgBtn";
import { useActivityTracker } from "../../hooks/activity/activityTracker.hook";
import type { ActivityType } from "../../lib/db/activities";
import { formatDuration } from "../../lib/format/duration";
import { colors } from "../../lib/theme/colors";

const TIPOS: { value: ActivityType; label: string }[] = [
    { value: 'HIKING', label: 'Senderismo' },
    { value: 'TRAIL_RUNNING', label: 'Trail running' },
    { value: 'CYCLING', label: 'Ciclismo' },
];

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
    const { status, pointCount, startedAt, permissionError, start, stop } = useActivityTracker();
    const recording = status === 'recording';
    const elapsed = useElapsedSeconds(startedAt, recording);

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

            <View style={styles.stats}>
                <View style={styles.stat}>
                    <Text style={styles.statValue}>{formatDuration(elapsed)}</Text>
                    <Text style={styles.statLabel}>Tiempo</Text>
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

            <PrimaryButton
                text={recording ? 'Detener actividad' : 'Iniciar actividad'}
                onPress={recording ? stop : () => start(type)}
                style={[styles.mainBtn, recording && styles.stopBtn]}
            />
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
        alignItems: 'center',
    },
    statValue: {
        fontSize: 40,
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
