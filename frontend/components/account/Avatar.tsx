import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import { avatarDe } from "../../lib/account/avatars";
import Icon from "../ui/Icon";

interface AvatarProps {
    avatarId: string | null | undefined;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

// Avatar predefinido (spec 011, RN-15): ícono con su color sobre background, con borde. Los
// colores de los avatares tienen contraste comprobado sobre background (contrast.ts). Es
// decorativo: quien lo usa dice qué es (por ejemplo, "Tu perfil").
export default function Avatar({ avatarId, size = 40, style }: AvatarProps) {
    const styles = useThemedStyles(makeStyles);
    const avatar = avatarDe(avatarId);
    return (
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}>
            <Icon name={avatar.icon} size={Math.round(size * 0.55)} color={avatar.color} decorative />
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    circle: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.colors.background,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
});
