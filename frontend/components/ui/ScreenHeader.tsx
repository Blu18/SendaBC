import type { ReactNode } from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import IconButton from "./IconButton";

interface ScreenHeaderProps {
    title: string;
    // Con onBack es el encabezado de una pantalla secundaria: botón volver y título más chico.
    onBack?: () => void;
    // Acciones a la derecha, normalmente uno o dos IconButton.
    actions?: ReactNode;
    style?: StyleProp<ViewStyle>;
}

// Encabezado de Figma, de 64 dp. Raíz: pantallas de pestaña, título headline.
// Secundaria: volver de 48 dp y título title.
export default function ScreenHeader({ title, onBack, actions, style }: ScreenHeaderProps) {
    const styles = useThemedStyles(makeStyles);
    const secondary = !!onBack;
    return (
        <View style={[styles.header, secondary ? styles.secondary : styles.root, style]}>
            {secondary && <IconButton icon="arrow-left" accessibilityLabel="Volver" onPress={onBack} />}
            <Text
                style={secondary ? styles.titleSecondary : styles.titleRoot}
                numberOfLines={1}
                accessibilityRole="header"
            >
                {title}
            </Text>
            {actions}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    header: {
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs,
        backgroundColor: t.colors.background,
        paddingRight: t.spacing.xs,
    },
    root: {
        paddingLeft: t.spacing.lg,
    },
    secondary: {
        paddingLeft: t.spacing.xs,
    },
    titleRoot: {
        ...t.typography.headline,
        color: t.colors.text,
        flex: 1,
    },
    titleSecondary: {
        ...t.typography.title,
        color: t.colors.text,
        flex: 1,
    },
});
