import { View, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useProfile } from "../../hooks/auth/auth.hooks";
import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import { countPendingUploads } from "../../lib/db/activities";
import { pendingUploadsWarning } from "../../lib/format/activity";

export default function MainPage() {
    const navigation = useNavigation();
    const { logout, userId } = useAuth();
    const profile = useProfile();

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

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pantalla principal</Text>

            {profile.isLoading && <ActivityIndicator size="large" color="#5C6B49" />}
            {profile.isError && <Text style={styles.error}>No se pudo cargar tu perfil</Text>}
            {profile.data && (
                <Text style={styles.subtitle}>Hola, {profile.data.displayName}</Text>
            )}

            <PrimaryButton
              text="Nueva actividad"
              style={styles.activityBtn}
              onPress={() => navigation.navigate('Activity')}
            />

            <PrimaryButton
              text="Mis actividades"
              style={styles.activityBtn}
              onPress={() => navigation.navigate('ActivityHistory')}
            />

            <PrimaryButton
              text="Explorar rutas"
              style={styles.activityBtn}
              onPress={() => navigation.navigate('ExploreRoutes')}
            />

            {/* Por ahora se entra desde aquí (spec 007, P8) */}
            <PrimaryButton
              text="Mis rutas"
              style={styles.activityBtn}
              onPress={() => navigation.navigate('MyRoutes')}
            />

            <PrimaryButton
              text="Mis favoritas"
              style={styles.activityBtn}
              onPress={() => navigation.navigate('Favorites')}
            />

            {/* Contactos de emergencia (spec 008, plan) */}
            <PrimaryButton
              text="Seguridad"
              style={styles.activityBtn}
              onPress={() => navigation.navigate('EmergencyContacts')}
            />

            <PrimaryButton text="Cerrar sesión" style={styles.logoutBtn} onPress={handleLogout} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        backgroundColor: "#EDEAE1",
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: "#2B2A26",
    },
    subtitle: {
        fontSize: 18,
        color: "#444444",
    },
    error: {
        color: "#B3261E",
    },
    // PrimaryButton trae alignSelf: 'stretch'; con ancho fijo eso lo pega a la izquierda
    activityBtn: {
        width: '60%',
        alignSelf: 'center',
    },
    logoutBtn: {
        width: '60%',
        alignSelf: 'center',
        marginTop: 24,
    },
});
