import { StyleSheet, Text, View } from "react-native";
import TrackThumbnail from "../map/TrackThumbnail";
import Icon, { type IconName } from "../ui/Icon";
import PressableScale from "../ui/PressableScale";
import SyncBadge from "../ui/SyncBadge";
import { useTrackPath } from "../../hooks/activity/useTrackPath";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import type { Activity, ActivityType } from "../../lib/db/activities";
import { ACTIVITY_TYPE_LABELS, formatStartedAt, SYNC_STATUS_LABELS, syncStatusOf } from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance } from "../../lib/format/metrics";
import { fontFamilies, type Theme } from "../../lib/theme";

// Tamaño de la miniatura, como el componente "Fila de bitácora" de Figma (versión 3).
const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 48;

const TYPE_ICONS: Record<ActivityType, IconName> = {
    HIKING: "hiking",
    TRAIL_RUNNING: "run",
    CYCLING: "bike",
};

type Props = {
    activity: Activity;
    onPress: () => void;
};

/**
 * Fila de la bitácora de Mis actividades (spec 014, CA-16, CA-17, CA-23). No lleva fondo propio:
 * va dentro de la lista agrupada de su mes.
 * - A la izquierda, la miniatura del recorrido; sin puntos válidos (o mientras se lee), el ícono
 *   del deporte.
 * - La insignia de sincronización solo aparece si la actividad no está sincronizada.
 * - Tipo, fecha, distancia y duración con los formatos de la spec 004 (CA-20).
 */
export default function ActivityLogRow({ activity, onPress }: Props) {
    const styles = useThemedStyles(makeStyles);
    const path = useTrackPath(activity.localId);
    const status = syncStatusOf(activity);
    const type = ACTIVITY_TYPE_LABELS[activity.type];
    const date = formatStartedAt(activity.startedAt);
    const distance = formatDistance(activity.distanceMeters);
    const duration = activity.durationSeconds === null ? "—" : formatDuration(activity.durationSeconds);
    const label = [type, date, distance, duration, status === "synced" ? null : SYNC_STATUS_LABELS[status]]
        .filter(Boolean)
        .join(", ");

    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={styles.row}
            pressedStyle={styles.pressed}
        >
            {path ? (
                <TrackThumbnail
                    path={path}
                    width={THUMB_WIDTH}
                    height={THUMB_HEIGHT}
                    accessibilityLabel={`${type}, ${distance}`}
                />
            ) : (
                <View style={styles.iconBox}>
                    <View style={styles.iconTint} />
                    <Icon name={TYPE_ICONS[activity.type]} color="primary" decorative />
                </View>
            )}
            <View style={styles.main}>
                <Text style={styles.type}>{type}</Text>
                <Text style={styles.date}>{date}</Text>
                {status !== "synced" && <SyncBadge status={status} style={styles.badge} />}
            </View>
            <View style={styles.stats}>
                <Text style={styles.distance}>{distance}</Text>
                <Text style={styles.duration}>{duration}</Text>
            </View>
        </PressableScale>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    row: {
        minHeight: t.touchMin,
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        overflow: "hidden",
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    iconBox: {
        width: THUMB_WIDTH,
        height: THUMB_HEIGHT,
        borderRadius: t.radius.sm,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    // Tinte del 12 % de primary, como en Figma (RN-13).
    iconTint: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    main: {
        flex: 1,
        gap: t.spacing.xxs,
    },
    type: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    date: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    badge: {
        marginTop: t.spacing.xs,
    },
    stats: {
        alignItems: "flex-end",
        gap: t.spacing.xxs,
    },
    distance: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        fontVariant: ["tabular-nums"],
        color: t.colors.data,
    },
    duration: {
        ...t.typography.caption,
        fontVariant: ["tabular-nums"],
        color: t.colors.textMuted,
    },
});
