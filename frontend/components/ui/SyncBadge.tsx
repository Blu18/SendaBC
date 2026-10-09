import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { SYNC_STATUS_LABELS, type SyncStatus } from "../../lib/format/activity";
import { colors } from "../../lib/theme/colors";

const BADGE_COLORS: Record<SyncStatus, string> = {
    synced: colors.primary,
    pending: colors.secondary,
    rejected: colors.error,
};

// Insignia con el estado de sincronización de una actividad (spec 005, CA-14). La usan
// "Mis actividades" y el resumen.
export default function SyncBadge({ status, style }: { status: SyncStatus; style?: StyleProp<ViewStyle> }) {
    return (
        <View style={[styles.badge, { borderColor: BADGE_COLORS[status] }, style]}>
            <Text style={[styles.text, { color: BADGE_COLORS[status] }]}>{SYNC_STATUS_LABELS[status]}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1.5,
    },
    text: {
        fontSize: 12,
        fontWeight: "600",
    },
});
