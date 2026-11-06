import { Component, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Notice from "../ui/Notice";
import { MAP_UNAVAILABLE } from "../../lib/map/messages";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import type { Theme } from "../../lib/theme";

type Props = {
    children: ReactNode;
    // Lo que debe seguir visible sin mapa: la alerta activa.
    overlay?: ReactNode;
};

// Si el mapa falla al dibujarse, se queda sin mapa y nada más: la grabación, las métricas y los
// botones siguen (spec 010, CA-17, RN-2).
export default class MapErrorBoundary extends Component<Props, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown) {
        console.log("Error mostrando el mapa:", error);
    }

    render() {
        return this.state.failed ? <MapUnavailable overlay={this.props.overlay} /> : this.props.children;
    }
}

function MapUnavailable({ overlay }: { overlay?: ReactNode }) {
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.area}>
            {overlay}
            <Notice title={MAP_UNAVAILABLE.title} description={MAP_UNAVAILABLE.description} />
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    area: {
        flex: 1,
        justifyContent: "center",
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
});
