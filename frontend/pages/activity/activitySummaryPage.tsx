import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, type LayoutChangeEvent } from "react-native";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import TerrainProfile from "../../components/activity/TerrainProfile";
import TrackThumbnail from "../../components/map/TrackThumbnail";
import Appear from "../../components/ui/Appear";
import BottomBar from "../../components/ui/BottomBar";
import BgBtn from "../../components/ui/buttons/BgBtn";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import Icon, { type IconName } from "../../components/ui/Icon";
import IconBadge from "../../components/ui/IconBadge";
import Metric from "../../components/ui/Metric";
import Notice from "../../components/ui/Notice";
import ScreenHeader from "../../components/ui/ScreenHeader";
import SyncBadge from "../../components/ui/SyncBadge";
import { useActivitySummary } from "../../hooks/activity/activitySummary.hook";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import type { Activity, ActivityType } from "../../lib/db/activities";
import {
    ACTIVITY_TYPE_LABELS,
    ELEVATION_SOURCE_LABELS,
    formatStartedAt,
    showsSpeed,
    syncStatusOf,
} from "../../lib/format/activity";
import { formatDuration } from "../../lib/format/duration";
import { formatDistance, formatElevation, formatPace, formatSpeed, splitUnit } from "../../lib/format/metrics";
import { averagePace, averageSpeed } from "../../lib/metrics/summary";
import { motivoNoPublicable } from "../../lib/routes/publish";
import { fontFamilies, type Theme } from "../../lib/theme";

// origin 'recording': se llega al detener y "Listo" regresa a la pantalla principal (CA-2).
// origin 'history': se llega desde "Mis actividades" y atrás regresa a la lista (CA-21).
type Props = StaticScreenProps<{ localId: number; origin: 'recording' | 'history' }>;

const TYPE_ICONS: Record<ActivityType, IconName> = {
    HIKING: "hiking",
    TRAIL_RUNNING: "run",
    CYCLING: "bike",
};

// Alto que ocupa el perfil (TerrainProfile) mientras se calcula, para que la pantalla no salte.
const PROFILE_PLACEHOLDER_HEIGHT = 228;
const ROUTE_THUMB_HEIGHT = 128;

// Qué ofrece el resumen para publicar (spec 007, CA-1 a CA-3, CA-8): el botón, el motivo por el
// que no se puede o "Ver ruta publicada". Si la ruta ya existe se sabe por "Mis rutas" (plan D7);
// mientras carga no se ofrece publicar. Sin conexión sí: el formulario avisa y el servidor
// responde 409 si ya tenía ruta.
function usePublishAction(activity: Activity | null, localId: number) {
    const navigation = useNavigation();
    const { routes, status } = useMyRoutes();
    if (!activity) return null;
    const existente = routes.find((r) => r.sourceActivityId === activity.serverId);
    const publicable = motivoNoPublicable(activity, existente);
    switch (publicable.kind) {
        case "publicable":
            if (status === "loading") return null;
            return { kind: "button" as const, text: "Publicar como ruta", onPress: () => navigation.navigate("PublishRoute", { localId }) };
        case "ya-publicada":
            return {
                kind: "button" as const,
                text: "Ver ruta publicada",
                onPress: () => navigation.navigate("RouteDetail", { id: publicable.rutaId }),
            };
        default:
            return { kind: "message" as const, text: publicable.mensaje };
    }
}

// Resumen de una actividad terminada, leído de SQLite (spec 004, CA-1, CA-3, RN-4), con su
// estado de sincronización (spec 005, CA-14). Diseño de la spec 014 (versión 3): distancia grande
// con su línea de contexto, el perfil del terreno como protagonista, ritmo y duración en una
// tarjeta, y la miniatura del recorrido (CA-1 a CA-12).
export default function ActivitySummaryPage({ route }: Props) {
    const { localId, origin } = route.params;
    const navigation = useNavigation();
    const { activity, pointCount, loading, details } = useActivitySummary(localId, { details: true });
    const publish = usePublishAction(activity, localId);
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [thumbWidth, setThumbWidth] = useState(0);
    const header = <ScreenHeader title="Resumen" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <View style={styles.screen}>
                {header}
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            </View>
        );
    }

    if (!activity) {
        return (
            <View style={styles.screen}>
                {header}
                <View style={styles.content}>
                    <Appear>
                        <Notice
                            type="error"
                            title="No se encontró la actividad"
                            description="Puede que se haya borrado de este teléfono."
                        />
                    </Appear>
                </View>
                <View style={styles.spacer} />
                <BottomBar>
                    <PrimaryButton text="Volver" onPress={() => navigation.goBack()} />
                </BottomBar>
            </View>
        );
    }

    const typeLabel = ACTIVITY_TYPE_LABELS[activity.type];
    const distanceText = formatDistance(activity.distanceMeters);
    const distance = splitUnit(distanceText);
    const duration = activity.durationSeconds ?? 0;
    // Ritmo o velocidad se derivan al mostrar, no se guardan (spec 004, CA-5, CA-6, RN-5)
    const speed = showsSpeed(activity.type);
    const average = splitUnit(
        speed
            ? formatSpeed(averageSpeed(activity.distanceMeters ?? 0, duration))
            : formatPace(averagePace(activity.distanceMeters ?? 0, duration))
    );
    const source = activity.elevationSource ? `${ELEVATION_SOURCE_LABELS[activity.elevationSource]}, ` : "";
    const note = `${source}${pointCount} ${pointCount === 1 ? "punto registrado" : "puntos registrados"}.`;

    const onThumbLayout = (e: LayoutChangeEvent) => setThumbWidth(Math.floor(e.nativeEvent.layout.width));
    const showListo = origin === "recording";
    // Lado a lado solo si son dos botones; con el motivo para no publicar, uno debajo del otro.
    const barDirection = showListo && publish?.kind === "button" ? "row" : "column";

    return (
        <View style={styles.screen}>
            {header}
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.meta}>
                    <IconBadge name={TYPE_ICONS[activity.type]} />
                    <View style={styles.metaText}>
                        <Text style={styles.type} accessibilityRole="header">{typeLabel}</Text>
                        <Text style={styles.date}>{formatStartedAt(activity.startedAt)}</Text>
                    </View>
                    <SyncBadge status={syncStatusOf(activity)} />
                </View>

                <View style={styles.hero}>
                    <View style={styles.distance} accessible accessibilityLabel={`Distancia: ${distanceText}`}>
                        <Text style={styles.distanceValue}>{distance.value}</Text>
                        {distance.unit ? <Text style={styles.distanceUnit}>{distance.unit}</Text> : null}
                    </View>
                    <Appear>
                        {details?.context ? (
                            <View style={styles.achievement}>
                                <View style={styles.achievementTint} />
                                <Icon name="star" size={14} color="secondary" decorative />
                                <Text style={styles.achievementText}>{details.context}</Text>
                            </View>
                        ) : null}
                    </Appear>
                </View>

                {details === null ? (
                    <View style={styles.profilePlaceholder} />
                ) : details.profile ? (
                    <TerrainProfile
                        profile={details.profile}
                        gainMeters={activity.elevationGainMeters}
                        lossMeters={activity.elevationLossMeters}
                    />
                ) : (
                    // Sin datos suficientes para el perfil: solo las cifras (CA-7).
                    <View style={[styles.card, styles.cardRow]}>
                        <Metric size="medium" value={formatElevation(activity.elevationGainMeters)} label="Elevación ganada" style={styles.flex} />
                        <Metric size="medium" value={formatElevation(activity.elevationLossMeters)} label="Elevación perdida" style={styles.flex} />
                    </View>
                )}

                <View style={styles.stats}>
                    <View style={[styles.card, styles.cardRow]}>
                        <View style={styles.flex} accessible accessibilityLabel={`${speed ? "Velocidad promedio" : "Ritmo promedio"}: ${average.value} ${average.unit}`}>
                            <Text style={styles.statLabel}>{speed ? "Velocidad promedio" : "Ritmo promedio"}</Text>
                            <View style={styles.statValueRow}>
                                <Text style={styles.statValue}>{average.value}</Text>
                                {average.unit ? <Text style={styles.statUnit}>{average.unit}</Text> : null}
                            </View>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.flex} accessible accessibilityLabel={`Duración: ${formatDuration(duration)}`}>
                            <Text style={styles.statLabel}>Duración</Text>
                            <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                        </View>
                    </View>
                    <Text style={styles.note}>{note}</Text>
                </View>

                {details && details.path.length > 0 ? (
                    <View style={styles.route} onLayout={onThumbLayout}>
                        <Text style={styles.routeTitle} accessibilityRole="header">Recorrido</Text>
                        {thumbWidth > 0 && (
                            <TrackThumbnail
                                path={details.path}
                                width={thumbWidth}
                                height={ROUTE_THUMB_HEIGHT}
                                accessibilityLabel={`Recorrido: ${typeLabel}, ${distanceText}`}
                                style={styles.thumb}
                            />
                        )}
                    </View>
                ) : null}
            </ScrollView>

            {(publish || showListo) && (
                <BottomBar direction={barDirection}>
                    {publish?.kind === "button" && (
                        <BgBtn text={publish.text} onPress={publish.onPress} style={barDirection === "row" ? styles.flex : undefined} />
                    )}
                    {publish?.kind === "message" && <Text style={styles.publishNotice}>{publish.text}</Text>}
                    {showListo && (
                        <PrimaryButton
                            text="Listo"
                            onPress={() => navigation.goBack()}
                            style={barDirection === "row" ? styles.flex : undefined}
                        />
                    )}
                </BottomBar>
            )}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    loading: {
        marginTop: t.spacing.xxl,
    },
    content: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
        paddingTop: t.spacing.xs,
        paddingBottom: t.spacing.xl,
    },
    spacer: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    meta: {
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.md,
    },
    metaText: {
        flex: 1,
    },
    type: {
        ...t.typography.body,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    date: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    hero: {
        gap: t.spacing.sm,
    },
    // Con letra grande la unidad baja a otro renglón en lugar de cortarse (CA-24).
    distance: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        columnGap: t.spacing.sm,
    },
    distanceValue: {
        ...t.typography.metricHero,
        color: t.colors.text,
    },
    distanceUnit: {
        ...t.typography.title,
        color: t.colors.textMuted,
    },
    achievement: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: t.spacing.xs + t.spacing.xxs,
        paddingLeft: t.spacing.sm + t.spacing.xxs,
        paddingRight: t.spacing.md,
        paddingVertical: t.spacing.xs,
        borderRadius: t.radius.pill,
        overflow: "hidden",
    },
    // Ocre al 18 %, como en Figma. El texto va en `text` (contraste, T6).
    achievementTint: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.secondary,
        opacity: 0.18,
    },
    achievementText: {
        ...t.typography.caption,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
        flexShrink: 1,
    },
    profilePlaceholder: {
        height: PROFILE_PLACEHOLDER_HEIGHT,
    },
    card: {
        padding: t.spacing.lg,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.surface,
        ...t.shadows.low,
    },
    cardRow: {
        flexDirection: "row",
        gap: t.spacing.lg,
    },
    stats: {
        gap: t.spacing.sm,
    },
    statLabel: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    statValueRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        columnGap: t.spacing.xs,
    },
    statValue: {
        ...t.typography.title,
        fontVariant: ["tabular-nums"],
        color: t.colors.data,
    },
    statUnit: {
        ...t.typography.caption,
        color: t.colors.data,
    },
    statDivider: {
        width: 1,
        backgroundColor: t.colors.border,
        opacity: 0.35,
    },
    note: {
        ...t.typography.caption,
        color: t.colors.textMuted,
    },
    route: {
        gap: t.spacing.sm,
    },
    routeTitle: {
        ...t.typography.bodySmall,
        fontFamily: fontFamilies.semibold,
        color: t.colors.text,
    },
    thumb: {
        borderRadius: t.radius.lg,
        ...t.shadows.low,
    },
    publishNotice: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
        textAlign: "center",
    },
});
