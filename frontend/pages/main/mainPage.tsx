import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useProfile } from "../../hooks/auth/auth.hooks";
import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import { useActivityTracker } from "../../hooks/activity/activityTracker.hook";

export default function MainPage() {
    const navigation = useNavigation();
    const { logout } = useAuth();
    const profile = useProfile();
    const { status, pointCount, start, stop } = useActivityTracker();

    const handleLogout = async () => {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Index' }] });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Pantalla principal</Text>

            {profile.isLoading && <ActivityIndicator size="large" color="#5C6B49" />}
            {profile.isError && <Text style={styles.error}>No se pudo cargar tu perfil</Text>}
            {profile.data && (
                <Text style={styles.subtitle}>Hola, {profile.data.displayName}</Text>
            )}

            <Text>Estado: {status} - Puntos: {pointCount}</Text>
            <PrimaryButton
              text={status === 'recording' ? 'Detener actividad' : 'Iniciar actividad'}
              onPress={status === 'recording' ? stop : () => start('HIKING')}
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
    logoutBtn: {
        width: '60%',
        marginTop: 24,
    },
});
