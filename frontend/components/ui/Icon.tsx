import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ColorTokens } from "../../lib/theme";
import { useTheme } from "../../hooks/theme/useTheme";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

// Ícono de Material Design Icons con el color de un token (spec 009). Si el ícono va
// solo, sin texto que lo explique, lleva accessibilityLabel; si acompaña a un texto
// que ya dice lo mismo, es decorativo y el lector de pantalla lo salta.
type IconProps = {
    name: IconName;
    size?: number;
    color?: keyof ColorTokens;
} & ({ accessibilityLabel: string; decorative?: never } | { decorative: true; accessibilityLabel?: never });

export default function Icon({ name, size = 24, color = "text", accessibilityLabel, decorative }: IconProps) {
    const theme = useTheme();
    return (
        <MaterialCommunityIcons
            name={name}
            size={size}
            color={theme.colors[color]}
            accessible={!decorative}
            accessibilityLabel={accessibilityLabel}
            importantForAccessibility={decorative ? "no-hide-descendants" : "yes"}
        />
    );
}
