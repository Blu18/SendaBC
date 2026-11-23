import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import Card from "../../components/ui/Card";
import Notice from "../../components/ui/Notice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import BgBtn from "../../components/ui/buttons/BgBtn";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useMapConnection } from "../../hooks/map/useMapConnection";
import { useOfflineZones } from "../../hooks/map/useOfflineZones";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import { ZONES_LIST_MESSAGES, describirZona, type ZoneItem } from "../../lib/map/offlineZones";
import type { Theme } from "../../lib/theme";

// Zonas del mapa descargadas en el teléfono (spec 011, CA-32, CA-33). Se ve el avance de las que
// se descargan; una interrumpida queda como incompleta y se puede reintentar. Al borrar una, sale
// de la lista; Mapbox libera su espacio con el tiempo (plan, R1). Se abre desde Inicio.
export default function OfflineZonesPage() {
    const navigation = useNavigation();
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const conectado = useMapConnection();
    const { zones, isLoading, isError, refetch, reintentar, borrar } = useOfflineZones();

    const onReintentar = (zone: ZoneItem) => {
        if (!conectado) {
            Alert.alert("Sin conexión", ZONES_LIST_MESSAGES.retryOffline);
            return;
        }
        reintentar.mutate(zone, {
            onError: (e) => {
                console.log("No se pudo reintentar la zona:", e);
                Alert.alert("No se pudo reintentar", "Intenta de nuevo en un momento.");
            },
        });
    };

    const onBorrar = (zone: ZoneItem) => {
        Alert.alert(ZONES_LIST_MESSAGES.deleteTitle, ZONES_LIST_MESSAGES.deleteBody, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Borrar",
                style: "destructive",
                onPress: () =>
                    borrar.mutate(zone.id, {
                        onError: (e) => {
                            console.log("No se pudo borrar la zona:", e);
                            Alert.alert("No se pudo borrar", "Intenta de nuevo en un momento.");
                        },
                    }),
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Mapas sin conexión" onBack={() => navigation.goBack()} />
            <FlatList
                data={zones}
                keyExtractor={(z) => z.id}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.intro}>{ZONES_LIST_MESSAGES.intro}</Text>
                        <PrimaryButton text="Descargar una zona" onPress={() => navigation.navigate("PickZone")} />
                        <Appear>
                            {isError && (
                                <View style={styles.header}>
                                    <Notice type="error" title="No se pudieron leer tus zonas" description="Intenta de nuevo." />
                                    <BgBtn text="Reintentar" onPress={() => void refetch()} />
                                </View>
                            )}
                        </Appear>
                    </View>
                }
                ListEmptyComponent={
                    isLoading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    ) : isError ? null : (
                        <Notice type="info" title="Sin zonas" description={ZONES_LIST_MESSAGES.empty} />
                    )
                }
                renderItem={({ item }) => {
                    const { title, detail } = describirZona(item);
                    const borrando = borrar.isPending && borrar.variables === item.id;
                    return (
                        <Appear>
                            <Card accessibilityLabel={`${title}. ${detail}`}>
                                <View style={styles.zone}>
                                    <Text style={styles.title}>{title}</Text>
                                    <Text style={styles.detail} accessibilityLiveRegion="polite">{detail}</Text>
                                    {item.status !== "ready" && (
                                        <View
                                            style={styles.track}
                                            accessibilityRole="progressbar"
                                            accessibilityValue={{ min: 0, max: 100, now: Math.floor(item.percentage) }}
                                        >
                                            <View style={styles.trackTint} />
                                            <View style={[styles.fill, { width: `${Math.min(100, item.percentage)}%` }]} />
                                        </View>
                                    )}
                                    <View style={styles.actions}>
                                        {item.status === "incomplete" && (
                                            <BgBtn text="Reintentar" onPress={() => onReintentar(item)} />
                                        )}
                                        <TextBtn
                                            text={borrando ? "Borrando..." : "Borrar"}
                                            onPress={() => onBorrar(item)}
                                            disabled={borrando}
                                        />
                                    </View>
                                </View>
                            </Card>
                        </Appear>
                    );
                }}
            />
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    list: {
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    header: {
        gap: t.spacing.md,
        marginBottom: t.spacing.sm,
    },
    intro: {
        ...t.typography.body,
        color: t.colors.text,
    },
    zone: {
        gap: t.spacing.sm,
    },
    title: {
        ...t.typography.body,
        fontFamily: t.typography.title.fontFamily,
        color: t.colors.text,
    },
    detail: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    track: {
        height: 6,
        borderRadius: t.radius.pill,
        overflow: "hidden",
    },
    // Riel de la barra: border al 30 %, como en Figma (spec 014).
    trackTint: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.border,
        opacity: 0.3,
    },
    fill: {
        height: "100%",
        backgroundColor: t.colors.primary,
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.sm,
    },
});
