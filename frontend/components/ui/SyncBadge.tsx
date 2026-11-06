import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { SYNC_STATUS_LABELS, type SyncStatus } from "../../lib/format/activity";
import { fontFamilies, type ColorTokens, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import Icon, { type IconName } from "./Icon";

// "Pendiente" usa secondaryText: secondary en texto de 12 no llega a 4.5:1 (spec 009, RN-4).
const BADGE: Record<SyncStatus, { color: keyof ColorTokens; icon: IconName }> = {
    synced: { color: "primary", icon: "cloud-check-outline" },
    pending: { color: "secondaryText", icon: "cloud-upload-outline" },
    rejected: { color: "error", icon: "cloud-alert-outline" },
};

// Insignia con el estado de sincronización de una actividad (spec 005, CA-14). La usan
// "Mis actividades" y el resumen. Lleva ícono y texto para no depender solo del color.
export default function SyncBadge({ status, style }: { status: SyncStatus; style?: StyleProp<ViewStyle> }) {
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { color, icon } = BADGE[status];
    return (
        <View style={[styles.badge, { borderColor: theme.colors[color] }, style]}>
            <Icon name={icon} size={16} color={color} decorative />
            <Text style={[styles.text, { color: theme.colors[color] }]}>{SYNC_STATUS_LABELS[status]}</Text>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    badge: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs,
        paddingHorizontal: t.spacing.sm,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
        borderWidth: 1.5,
    },
    text: {
        ...t.typography.caption,
        fontFamily: fontFamilies.semibold,
    },
});
