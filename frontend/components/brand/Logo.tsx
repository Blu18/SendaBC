import { Image, StyleProp, ImageStyle } from "react-native";
import { useTheme } from "../../hooks/theme/useTheme";

// Los PNG van con el fondo del modo (background) porque la exportación de Figma no conserva
// la transparencia (spec 009, T7). Se usan solo sobre ese mismo fondo.
const LOGO = {
    light: require("../../assets/brand/logo-claro.png"),
    dark: require("../../assets/brand/logo-oscuro.png"),
};

// Logo horizontal aprobado en Figma, en la versión de cada modo (CA-14). Va empaquetado
// en la app, así que se ve sin conexión.
export default function Logo({ style }: { style?: StyleProp<ImageStyle> }) {
    const theme = useTheme();
    return (
        <Image
            source={LOGO[theme.scheme]}
            style={[{ width: 234, height: 56 }, style]}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="SendaBC"
        />
    );
}
