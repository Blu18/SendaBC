import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    children: ReactNode;
    // "column" apila los botones (lo normal); "row" los pone lado a lado, como "Publicar como
    // ruta" y "Listo" en el resumen.
    direction?: "column" | "row";
    style?: StyleProp<ViewStyle>;
};

// Barra fija de abajo con las acciones de una pantalla (spec 014, RN-13; plan D9). Fondo surface
// y sombra hacia arriba en lugar del borde superior. El área segura de abajo ya la da el
// SafeAreaView de App.tsx, así que aquí no se suma otra vez.
export default function BottomBar({ children, direction = "column", style }: Props) {
    const styles = useThemedStyles(makeStyles);
    return <View style={[styles.bar, direction === "row" && styles.row, style]}>{children}</View>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
    bar: {
        gap: t.spacing.sm,
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.md,
        paddingBottom: t.spacing.lg,
        backgroundColor: t.colors.surface,
        ...t.shadows.bar,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
});
