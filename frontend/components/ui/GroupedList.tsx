import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type Props = {
    children: ReactNode;
    // Dónde empieza cada divisor, en dp desde el borde izquierdo: después del ícono o de la
    // miniatura de las filas. Sin ícono, el padding de la fila.
    inset?: number;
    style?: StyleProp<ViewStyle>;
};

// Lista agrupada (spec 014, RN-13; plan D10): una tarjeta surface con radio lg y sombra baja, con
// las filas una debajo de otra y divisores con sangría entre ellas. La sombra va en el grupo y no
// en cada fila, para que una lista larga se desplace sin trabas (CA-29).
export default function GroupedList({ children, inset, style }: Props) {
    const styles = useThemedStyles(makeStyles);
    const items = Children.toArray(children).filter(isValidElement);
    return (
        <View style={[styles.card, style]}>
            {items.map((child, i) => (
                <Fragment key={child.key ?? i}>
                    {i > 0 && (
                        <View
                            style={[styles.divider, inset !== undefined && { marginLeft: inset }]}
                            accessible={false}
                            importantForAccessibility="no"
                        />
                    )}
                    {child}
                </Fragment>
            ))}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    card: {
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
        overflow: "hidden",
        ...t.shadows.low,
    },
    divider: {
        height: StyleSheet.hairlineWidth * 2,
        marginLeft: t.spacing.lg,
        backgroundColor: t.colors.border,
        // Como en Figma: el divisor separa sin pesar (RN-13).
        opacity: 0.22,
    },
});
