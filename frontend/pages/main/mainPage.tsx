import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import { useProfile } from "../../hooks/auth/auth.hooks";
import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import Icon from "../../components/ui/Icon";
import PressableScale from "../../components/ui/PressableScale";
import Avatar from "../../components/account/Avatar";
import SafetyCard from "../../components/safety/SafetyCard";
import { useEmergencyContacts } from "../../hooks/safety/useEmergencyContacts";
import { contactosActivos } from "../../lib/safety/contacts";
import { darkTheme, lightTheme, type Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";
import { countPendingUploads } from "../../lib/db/activities";
import { pendingUploadsWarning } from "../../lib/format/activity";

export default function MainPage() {
    const navigation = useNavigation();
    const { logout, userId } = useAuth();
    const profile = useProfile();
    const { contacts, status: contactsStatus } = useEmergencyContacts();
    const nombresActivos = contactosActivos(contacts).map((c) => c.name);
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);

    const cerrarSesion = async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Index' }] });
    };

    // Spec 005, CA-24: con actividades sin subir, avisar antes de cerrar sesión. Las actividades
    // no se borran: se suben cuando esa cuenta vuelva a iniciar sesión (RN-4).
    const handleLogout = async () => {
        let pendientes = 0;
        try {
            if (userId) pendientes = await countPendingUploads(userId);
        } catch (e) {
            // Sin el conteo se cierra sesión igual: los datos se conservan en el teléfono.
            console.log('Error contando actividades sin subir:', e);
        }

        const aviso = pendingUploadsWarning(pendientes);
        if (!aviso) {
            await cerrarSesion();
            return;
        }
        Alert.alert('Actividades sin subir', aviso, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar sesión', style: 'destructive', onPress: () => void cerrarSesion() },
        ]);
    };

    // "Empezar" va sobre la tarjeta primary: usa primary y onPrimary del modo contrario, como en
    // Figma (los dos pares ya están en la tabla de contraste, CA-3).
    const inverse = theme.scheme === 'dark' ? lightTheme.colors : darkTheme.colors;

    return (
        <View style={styles.container}>
            <ScreenHeader
                title={profile.data ? `Hola, ${profile.data.displayName}` : 'Inicio'}
                actions={
                    // Avatar de la cuenta (spec 011, CA-42): abre el perfil.
                    <PressableScale
                        onPress={() => navigation.navigate('Profile')}
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
                {profile.isLoading && <ActivityIndicator size="large" color={theme.colors.primary} />}
                <Appear>
                    {profile.isError && (
                        <Notice
                            type="error"
                            title="No se pudo cargar tu perfil"
                            description="Tus actividades se siguen grabando en el teléfono."
                        />
                    )}
                </Appear>

                <View style={styles.newActivity}>
                    <Icon name="hiking" size={40} color="onPrimary" decorative />
                    <Text style={styles.newActivityTitle}>Nueva actividad</Text>
                    <Text style={styles.newActivityText}>
                        Graba tu recorrido aunque no tengas señal. Se sube solo cuando vuelva la conexión.
                    </Text>
                    <PrimaryButton
                        text="Empezar"
                        style={{ backgroundColor: inverse.primary }}
                        textStyle={{ color: inverse.onPrimary }}
                        onPress={() => navigation.navigate('Activity')}
                    />
                </View>

                {/* Resumen de seguridad (spec 008, CA-8); solo con la lista ya cargada, para no
                    avisar "sin contactos" por un error de red. */}
                <Text style={styles.sectionTitle} accessibilityRole="header">Seguridad</Text>
                {contactsStatus === 'success' && (
                    <SafetyCard nombres={nombresActivos} onConfigurar={() => navigation.navigate('Home', { screen: 'Safety' })} />
                )}

                <TextBtn text="Cerrar sesión" style={styles.logoutBtn} onPress={handleLogout} />
            </ScrollView>
        </View>
    )
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    content: {
        gap: t.spacing.lg,
        padding: t.spacing.lg,
    },
    newActivity: {
        gap: t.spacing.md,
        padding: t.spacing.xl,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.primary,
    },
    newActivityTitle: {
        ...t.typography.headline,
        color: t.colors.onPrimary,
    },
    newActivityText: {
        ...t.typography.bodySmall,
        color: t.colors.onPrimary,
    },
    sectionTitle: {
        ...t.typography.title,
        color: t.colors.text,
    },
    // Área de toque de 48 dp (touchMin) alrededor del avatar de 40.
    avatarBtn: {
        width: t.touchMin,
        height: t.touchMin,
        borderRadius: t.touchMin / 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarPressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    logoutBtn: {
        alignSelf: 'flex-start',
    },
});
