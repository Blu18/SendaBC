import type { ReactNode } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import BottomBar from "../../components/ui/BottomBar";
import GroupedList from "../../components/ui/GroupedList";
import Appear from "../../components/ui/Appear";
import { useProfile } from "../../hooks/auth/auth.hooks";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import PressableScale from "../../components/ui/PressableScale";
import Avatar from "../../components/account/Avatar";
import SafetyCard from "../../components/safety/SafetyCard";
import WeekSummary from "../../components/home/WeekSummary";
import Card from "../../components/ui/Card";
import ActivityCard from "../../components/home/ActivityCard";
import RouteCard from "../../components/home/RouteCard";
import PopularRouteRow from "../../components/home/PopularRouteRow";
import PrepRow from "../../components/home/PrepRow";
import { useHomeActivities } from "../../hooks/home/useHomeActivities";
import { useNearbyHome, usePopularRoutes } from "../../hooks/home/useHomeRoutes";
import { useEmergencyContacts } from "../../hooks/safety/useEmergencyContacts";
import { HOME_MESSAGES, pendingTitle } from "../../lib/home/messages";
import { weekSummaryText } from "../../lib/home/summary";
import { contactosActivos } from "../../lib/safety/contacts";
import type { Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// Inicio (spec 013, propuesta D · A + C aprobada en Figma, T2). De arriba abajo: saludo, totales
// de los últimos 7 días, rutas cerca de ti, tus actividades, rutas populares y "Listo para salir".
// "Empezar actividad" queda fijo sobre la barra de pestañas (CA-1). Lo que viene del teléfono se
// ve sin conexión (CA-21); las secciones de rutas dicen si falta conexión (CA-22).
// Divisores de las listas agrupadas de Inicio (spec 014, RN-13): empiezan después del número de
// la ruta (padding 16 + número 24 + separación 12) o del ícono de la fila (16 + 40 + 12).
const POPULAR_DIVIDER_INSET = 52;
const PREP_DIVIDER_INSET = 68;

export default function MainPage() {
    const navigation = useNavigation();
    const profile = useProfile();
    const { recent, totals, pending } = useHomeActivities();
    const nearby = useNearbyHome();
    const popular = usePopularRoutes();
    const { contacts, status: contactsStatus } = useEmergencyContacts();
    const nombresActivos = contactosActivos(contacts).map((c) => c.name);
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);

    const abrirRuta = (id: string) => navigation.navigate("RouteDetail", { id });
    const verMapa = () => navigation.navigate("Home", { screen: "ExploreRoutes" });
    const cargando = <ActivityIndicator color={theme.colors.primary} style={styles.loading} />;
    const pendientes = pendingTitle(pending);

    return (
        <View style={styles.container}>
            <ScreenHeader
                // Sin perfil (sin red y sin caché) el saludo es genérico y todo lo demás sigue (CA-23).
                title={profile.data ? `Hola, ${profile.data.displayName}` : "Hola"}
                actions={
                    // Avatar de la cuenta (spec 011, CA-42): abre el perfil, donde está "Cerrar sesión" (CA-24).
                    <PressableScale
                        onPress={() => navigation.navigate("Profile")}
                        accessibilityRole="button"
                        accessibilityLabel="Tu perfil"
                        style={styles.avatarBtn}
                        pressedStyle={styles.avatarPressed}
                    >
                        <Avatar avatarId={profile.data?.avatarId} size={40} />
                    </PressableScale>
                }
            />
            <ScrollView contentContainerStyle={styles.content}>
                {/* Totales de los últimos 7 días (CA-6), en una tarjeta con sombra baja como las demás
                    (spec 015, CA-21, plan D9). */}
                {totals && (
                    <Card>
                        <WeekSummary summary={weekSummaryText(totals)} />
                    </Card>
                )}

                {/* Rutas cerca de ti (CA-9 a CA-12). */}
                <Section
                    title="Cerca de ti"
                    action={nearby.status === "ready" ? <TextBtn text="Ver mapa" onPress={verMapa} /> : null}
                >
                    {nearby.status === "loading" && cargando}
                    {nearby.status === "ready" && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.carousel}
                            contentContainerStyle={styles.carouselContent}
                        >
                            {nearby.items.map((route) => (
                                <RouteCard key={route.id} route={route} onPress={() => abrirRuta(route.id)} />
                            ))}
                        </ScrollView>
                    )}
                    <Appear style={styles.group}>
                        {nearby.status === "empty" && (
                            <>
                                <Notice {...HOME_MESSAGES.nearbyEmpty} />
                                <TextBtn text="Explorar el mapa" onPress={verMapa} style={styles.linkBtn} />
                            </>
                        )}
                        {nearby.status === "noPermission" && <Notice {...HOME_MESSAGES.nearbyNoPermission} />}
                        {nearby.status === "offline" && <Notice type="offline" {...HOME_MESSAGES.nearbyOffline} />}
                        {nearby.status === "error" && (
                            <>
                                <Notice type="error" {...HOME_MESSAGES.nearbyError} />
                                <TextBtn text="Reintentar" onPress={nearby.retry} style={styles.linkBtn} />
                            </>
                        )}
                    </Appear>
                </Section>

                {/* Tus actividades: las 3 más recientes (CA-3 a CA-5, CA-7). */}
                <Section
                    title="Tus actividades"
                    action={
                        recent.length > 0 ? (
                            <TextBtn text="Ver todas" onPress={() => navigation.navigate("Home", { screen: "ActivityHistory" })} />
                        ) : null
                    }
                >
                    {totals && recent.length === 0 && <Notice {...HOME_MESSAGES.noActivities} />}
                    {recent.map((activity) => (
                        <ActivityCard
                            key={activity.localId}
                            activity={activity}
                            onPress={() => navigation.navigate("ActivitySummary", { localId: activity.localId, origin: "history" })}
                        />
                    ))}
                </Section>

                {/* Rutas populares de todo Baja California (CA-13 a CA-15). Sin favoritas, no aparece. */}
                {popular.status !== "empty" && (
                    <Section title="Populares">
                        {popular.status === "loading" && cargando}
                        {popular.status === "ready" && (
                            <GroupedList inset={POPULAR_DIVIDER_INSET}>
                                {popular.items.map((route, i) => (
                                    <PopularRouteRow
                                        key={route.id}
                                        route={route}
                                        position={i + 1}
                                        onPress={() => abrirRuta(route.id)}
                                    />
                                ))}
                            </GroupedList>
                        )}
                        <Appear style={styles.group}>
                            {popular.status === "offline" && <Notice type="offline" {...HOME_MESSAGES.popularOffline} />}
                            {popular.status === "error" && (
                                <>
                                    <Notice type="error" {...HOME_MESSAGES.popularError} />
                                    <TextBtn text="Reintentar" onPress={popular.retry} style={styles.linkBtn} />
                                </>
                            )}
                        </Appear>
                    </Section>
                )}

                {/* Listo para salir (CA-18 a CA-20). Los contactos solo con la lista ya cargada, para
                    no avisar "sin contactos" por un error de red (spec 008, CA-8). */}
                <Section title="Listo para salir">
                    {contactsStatus === "success" && (
                        <SafetyCard nombres={nombresActivos} onConfigurar={() => navigation.navigate("Home", { screen: "Safety" })} />
                    )}
                    <GroupedList inset={PREP_DIVIDER_INSET}>
                        {pendientes && (
                            <PrepRow
                                icon="cloud-upload-outline"
                                iconColor="secondaryText"
                                title={pendientes}
                                description={HOME_MESSAGES.pendingDescription}
                            />
                        )}
                        <PrepRow
                            icon="map-outline"
                            iconColor="data"
                            title={HOME_MESSAGES.offlineMaps.title}
                            description={HOME_MESSAGES.offlineMaps.description}
                            onPress={() => navigation.navigate("OfflineZones")}
                        />
                    </GroupedList>
                </Section>

                {/* Las miniaturas no llevan logo ni atribución dentro de la imagen (spec 013, T15). */}
                <Text style={styles.attribution}>{HOME_MESSAGES.attribution}</Text>
            </ScrollView>

            {/* Fijo sobre la barra de pestañas, visible sin desplazarse (CA-1, CA-2). */}
            <BottomBar style={styles.startBar}>
                <PrimaryButton text="Empezar actividad" onPress={() => navigation.navigate("Activity")} />
            </BottomBar>
        </View>
    );
}

// Sección con encabezado (para el lector de pantalla, CA-28) y una acción opcional a la derecha.
function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
                {action}
            </View>
            {children}
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    content: {
        gap: t.spacing.xl,
        padding: t.spacing.lg,
    },
    loading: {
        alignSelf: "flex-start",
        marginVertical: t.spacing.sm,
    },
    section: {
        gap: t.spacing.md,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: t.spacing.sm,
        minHeight: t.touchMin,
    },
    sectionTitle: {
        ...t.typography.title,
        color: t.colors.text,
        flexShrink: 1,
    },
    group: {
        gap: t.spacing.sm,
    },
    linkBtn: {
        alignSelf: "flex-start",
    },
    // El carrusel llega hasta el borde derecho de la pantalla, para que se note que hay más.
    carousel: {
        marginRight: -t.spacing.lg,
    },
    // Arriba y no estiradas: cada tarjeta mide lo que su contenido (pendiente P-A de T24).
    carouselContent: {
        gap: t.spacing.md,
        paddingRight: t.spacing.lg,
        alignItems: "flex-start",
    },
    // Como el componente "Barra de empezar" de Figma: fondo de la pantalla y sombra hacia arriba.
    startBar: {
        backgroundColor: t.colors.background,
    },
    attribution: {
        ...t.typography.caption,
        color: t.colors.textMuted,
        textAlign: "center",
    },
    // Área de toque de 48 dp (touchMin) alrededor del avatar de 40.
    avatarBtn: {
        width: t.touchMin,
        height: t.touchMin,
        borderRadius: t.touchMin / 2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    avatarPressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
});
