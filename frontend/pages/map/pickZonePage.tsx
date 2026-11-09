import { useState } from "react";
import { Alert, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Mapbox from "@rnmapbox/maps";
import Appear from "../../components/ui/Appear";
import Notice from "../../components/ui/Notice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useMapConnection } from "../../hooks/map/useMapConnection";
import { useOfflineZones } from "../../hooks/map/useOfflineZones";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import { ZOOM_OVERVIEW } from "../../lib/map/camera";
import {
    ZONE_MESSAGES,
    estadoDelSelector,
    marcoALimites,
    resumenDeZona,
    type ZoneBounds,
} from "../../lib/map/offlineZones";
import { mapStyle } from "../../lib/map/style";
import { BAJA_CALIFORNIA_REGION } from "../../lib/routes/constants";
import type { Theme } from "../../lib/theme";

// Fracción del lado más corto del mapa que ocupa el marco: deja ver lo que lo rodea.
const FRAME_FRACTION = 0.8;
const INICIO: [number, number] = [BAJA_CALIFORNIA_REGION.longitude, BAJA_CALIFORNIA_REGION.latitude];

type Camara = { center: [number, number]; zoom: number };

// Elegir una zona para descargar (spec 011, CA-31, CA-34; plan, "Zonas"). El usuario mueve y
// acerca el mapa; la zona es lo que queda dentro del marco fijo del centro. Va en 2D y hacia el
// norte, para que el marco coincida con los límites (offlineZones.marcoALimites). No usa la
// ubicación (spec 010, CA-8): empieza con todo Baja California.
export default function PickZonePage() {
    const navigation = useNavigation();
    const { scheme } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const conectado = useMapConnection();
    const { zones, isLoading, descargar } = useOfflineZones();

    const [lado, setLado] = useState<number | null>(null);
    const [camara, setCamara] = useState<Camara>({ center: INICIO, zoom: ZOOM_OVERVIEW });

    const onLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setLado(Math.round(Math.min(width, height) * FRAME_FRACTION));
    };

    const onCamara = (state: Mapbox.MapState) => {
        const [lng, lat] = state.properties.center;
        setCamara({ center: [lng, lat], zoom: state.properties.zoom });
    };

    const bounds: ZoneBounds | null =
        lado === null
            ? null
            : marcoALimites({
                  center: { longitude: camara.center[0], latitude: camara.center[1] },
                  zoom: camara.zoom,
                  widthPx: lado,
                  heightPx: lado,
              });
    const estado = estadoDelSelector({ conectado, zonas: isLoading ? null : zones.length, bounds });

    // Confirmar o cancelar con el tamaño a la vista (CA-31). Se avisa del consumo de datos.
    const onDescargar = () => {
        if (estado.kind !== "ok") return;
        Alert.alert(
            "¿Descargar esta zona?",
            `${resumenDeZona(estado.areaKm2, estado.sizeMb)}. Usa conexión de datos; mejor con Wi-Fi.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Descargar",
                    onPress: () =>
                        descargar.mutate(estado.bounds, {
                            onSuccess: () => navigation.goBack(),
                            onError: (e) => {
                                console.log("No se pudo empezar a descargar la zona:", e);
                                Alert.alert("No se pudo descargar", "Intenta de nuevo en un momento.");
                            },
                        }),
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Descargar zona" onBack={() => navigation.goBack()} />
            <View style={styles.map} onLayout={onLayout}>
                <Mapbox.MapView
                    style={styles.map}
                    styleURL={mapStyle(scheme).styleURL}
                    scaleBarEnabled={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    onCameraChanged={onCamara}
                    onMapIdle={onCamara}
                    accessibilityLabel="Mapa para elegir la zona"
                >
                    <Mapbox.Camera defaultSettings={{ centerCoordinate: INICIO, zoomLevel: ZOOM_OVERVIEW }} />
                </Mapbox.MapView>
                {lado !== null && (
                    <View style={styles.frameWrap} pointerEvents="none">
                        <View style={[styles.frame, { width: lado, height: lado }]} />
                    </View>
                )}
            </View>
            <View style={styles.panel}>
                <Appear>
                    {estado.kind === "offline" && (
                        <Notice type="offline" title="Sin conexión" description={ZONE_MESSAGES.offline} />
                    )}
                    {estado.kind === "too-many" && (
                        <Notice type="error" title="Ya tienes 10 zonas" description={ZONE_MESSAGES.tooMany} />
                    )}
                    {estado.kind === "too-large" && (
                        <Notice type="error" title="Zona demasiado grande" description={ZONE_MESSAGES.tooLarge} />
                    )}
                </Appear>
                {estado.kind === "ok" && (
                    <View accessible accessibilityLiveRegion="polite">
                        <Text style={styles.size}>{resumenDeZona(estado.areaKm2, estado.sizeMb)}</Text>
                        <Text style={styles.hint}>Mueve y acerca el mapa para ajustar la zona al marco.</Text>
                    </View>
                )}
                <PrimaryButton
                    text={descargar.isPending ? "Empezando..." : "Descargar zona"}
                    onPress={onDescargar}
                    disabled={estado.kind !== "ok" || descargar.isPending}
                />
                <TextBtn text="Cancelar" onPress={() => navigation.goBack()} />
            </View>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    map: {
        flex: 1,
    },
    frameWrap: {
        ...StyleSheet.absoluteFill,
        alignItems: "center",
        justifyContent: "center",
    },
    frame: {
        borderWidth: 3,
        borderColor: t.colors.primary,
        borderRadius: t.radius.sm,
    },
    panel: {
        gap: t.spacing.md,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surface,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
    size: {
        ...t.typography.title,
        color: t.colors.text,
    },
    hint: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
});
