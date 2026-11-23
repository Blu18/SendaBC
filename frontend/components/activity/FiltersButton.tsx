import { StyleSheet, Text, View } from "react-native";
import { fontFamilies, type Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import IconButton from "../ui/IconButton";

type Props = {
    // Filtros activos: con uno o más, el contador en primary (spec 015, CA-7).
    count: number;
    onPress: () => void;
};

// Botón "Filtros" del encabezado de Mis actividades, como en Figma: el ícono filter-variant y,
// con filtros, un contador en la esquina. El lector de pantalla oye "Filtros, 2 activos".
export default function FiltersButton({ count, onPress }: Props) {
    const styles = useThemedStyles(makeStyles);
    const label = count > 0 ? `Filtros, ${count} ${count === 1 ? "activo" : "activos"}` : "Filtros";
    return (
        <View>
            <IconButton icon="filter-variant" accessibilityLabel={label} onPress={onPress} />
            {count > 0 && (
                <View style={styles.badge} pointerEvents="none" importantForAccessibility="no-hide-descendants">
                    <Text style={styles.badgeText}>{count}</Text>
                </View>
            )}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    // Arriba a la derecha del ícono de 24, dentro del área de 48 (Figma: x 28, y 4).
    badge: {
        position: "absolute",
        top: t.spacing.xs,
        right: t.spacing.xxs,
        minWidth: 18,
        paddingHorizontal: t.spacing.xs,
        paddingVertical: t.spacing.xxs / 2,
        borderRadius: t.radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: t.colors.primary,
    },
    badgeText: {
        ...t.typography.caption,
        fontFamily: fontFamilies.bold,
        color: t.colors.onPrimary,
    },
});
