import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import BottomBar from "../../components/ui/BottomBar";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import TextField from "../../components/ui/TextField";
import { useAuth } from "../../context/AuthContext";
import { useAccount } from "../../hooks/account/useAccount";
import { useMyRoutes } from "../../hooks/routes/useRouteLists";
import { esContrasenaIncorrecta, mensajeDeCuenta } from "../../lib/account/api";
import {
    avisoPendientes,
    avisoRutasPublicadas,
    bloqueoDeBorrado,
    QUE_SE_BORRA,
} from "../../lib/account/deletion";
import { queryClient } from "../../lib/api/queryClient";
import { deleteLocalAccount, getEstadoLocalDeCuenta, type EstadoLocalDeCuenta } from "../../lib/db/account";
import type { Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// Borrar la cuenta (spec 011, CA-46 a CA-48). Explica qué se borra, cuántas actividades sin subir
// se pierden y que las rutas publicadas siguen sin autor. Con una actividad en curso o una alerta
// activa no deja continuar (CA-47). Pide la contraseña y confirma antes. Al terminar borra los
// datos de este teléfono, cierra la sesión y vuelve al inicio.
export default function DeleteAccountPage() {
    const navigation = useNavigation();
    const { userId, logout } = useAuth();
    const { remove } = useAccount();
    const { routes, retry: recargarRutas } = useMyRoutes();
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);

    const [estado, setEstado] = useState<EstadoLocalDeCuenta | null>(null);
    const [password, setPassword] = useState("");
    const [errorPassword, setErrorPassword] = useState<string | null>(null);
    const [aviso, setAviso] = useState<{ offline: boolean; texto: string } | null>(null);

    const cargarEstado = useCallback(async () => {
        if (!userId) return null;
        const nuevo = await getEstadoLocalDeCuenta(userId);
        setEstado(nuevo);
        return nuevo;
    }, [userId]);

    // Al volver a la pantalla (por ejemplo, después de terminar la actividad o de recuperar la
    // conexión) se revisan otra vez el estado local y "Mis rutas", para que el aviso de rutas
    // publicadas no se quede con un resultado viejo sin conexión (CA-48).
    useFocusEffect(
        useCallback(() => {
            void cargarEstado();
            recargarRutas();
        }, [cargarEstado, recargarRutas])
    );

    const bloqueo = estado ? bloqueoDeBorrado(estado) : null;
    const publicadas = routes.filter((r) => r.status === "PUBLISHED").length;
    const avisos = [
        estado ? avisoPendientes(estado.pendientes) : null,
        avisoRutasPublicadas(publicadas),
    ].filter((a): a is string => a !== null);

    const terminar = async () => {
        if (userId) {
            try {
                await deleteLocalAccount(userId);
            } catch (e) {
                // La cuenta ya no existe en el servidor: se cierra la sesión igual. Lo que quede en
                // el teléfono no lo ve nadie, porque las consultas filtran por user_id (CA-49).
                console.log("Error borrando los datos locales de la cuenta:", e);
            }
        }
        queryClient.clear();
        await logout();
        navigation.reset({ index: 0, routes: [{ name: "Index" }] });
    };

    const borrar = () => {
        remove.mutate(password, {
            onSuccess: () => void terminar(),
            onError: (fallo) => {
                if (esContrasenaIncorrecta(fallo)) {
                    setErrorPassword(mensajeDeCuenta(fallo));
                    return;
                }
                setAviso({ offline: "offline" in fallo, texto: mensajeDeCuenta(fallo) });
            },
        });
    };

    const onBorrar = async () => {
        setAviso(null);
        if (!password) {
            setErrorPassword("Escribe tu contraseña");
            return;
        }
        // Se revisa otra vez justo antes, por si empezó una actividad en segundo plano.
        const actual = await cargarEstado();
        if (actual && bloqueoDeBorrado(actual)) return;

        Alert.alert("¿Borrar tu cuenta?", "No se puede deshacer.", [
            { text: "Cancelar", style: "cancel" },
            { text: "Borrar cuenta", style: "destructive", onPress: borrar },
        ]);
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Borrar cuenta" onBack={() => navigation.goBack()} />
            {!estado ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
            ) : (
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Appear>
                        {aviso && (
                            <Notice
                                type={aviso.offline ? "offline" : "error"}
                                title={aviso.offline ? "Sin conexión" : "No se pudo borrar la cuenta"}
                                description={aviso.texto}
                                onClose={() => setAviso(null)}
                            />
                        )}
                    </Appear>
                    {bloqueo && <Notice type="error" title="Ahora no se puede borrar" description={bloqueo} />}

                    <Text style={styles.texto}>{QUE_SE_BORRA}</Text>
                    {avisos.map((texto) => (
                        <Text key={texto} style={styles.importante}>
                            {texto}
                        </Text>
                    ))}

                    <TextField
                        label="Contraseña"
                        helper="Para confirmar que eres tú."
                        value={password}
                        onChangeText={(texto) => {
                            setPassword(texto);
                            if (errorPassword) setErrorPassword(null);
                        }}
                        error={errorPassword}
                        secureTextEntry
                        autoComplete="current-password"
                        editable={!bloqueo}
                    />
                </ScrollView>
            )}
            <BottomBar>
                <PrimaryButton
                    variant="danger"
                    text={remove.isPending ? "Borrando..." : "Borrar mi cuenta"}
                    onPress={() => void onBorrar()}
                    disabled={!estado || !!bloqueo || remove.isPending}
                />
            </BottomBar>
        </View>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    loading: {
        marginTop: t.spacing.xxl,
    },
    content: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    texto: {
        ...t.typography.body,
        color: t.colors.text,
    },
    importante: {
        ...t.typography.body,
        fontFamily: t.typography.title.fontFamily,
        color: t.colors.text,
    },
});
