import { StyleSheet, View } from "react-native";
import type { ColorTokens } from "../../lib/theme";
import { useTheme } from "../../hooks/theme/useTheme";
import Icon, { type IconName } from "./Icon";

type Props = {
    name: IconName;
    color?: keyof ColorTokens;
    size?: number; // diámetro del círculo
};

// Ícono de tipo o categoría dentro de un círculo con su mismo color como tinte al 14 % (spec 014,
// RN-13). El ícono es decorativo: siempre va junto a un texto que dice lo mismo. El contraste del
// ícono sobre el tinte se midió en T6 (10:1 o más en los dos modos).
export default function IconBadge({ name, color = "primary", size = 40 }: Props) {
    const { colors } = useTheme();
    return (
        <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors[color], opacity: 0.14 }]} />
            <Icon name={name} size={Math.round(size * 0.55)} color={color} decorative />
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
});
