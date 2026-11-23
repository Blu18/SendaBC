import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import BottomBar from "../../components/ui/BottomBar";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import TextField from "../../components/ui/TextField";
import { useProfile } from "../../hooks/auth/auth.hooks";
import { useAccount } from "../../hooks/account/useAccount";
import { erroresDeCuenta, esContrasenaIncorrecta, mensajeDeCuenta } from "../../lib/account/api";
import { validarCambioCorreo, type EmailFormErrors } from "../../lib/account/credentials";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";
import KeyboardScreen from "../../components/ui/KeyboardScreen";

// Cambiar el correo (spec 011, CA-43, CA-45). Pide la contraseña actual. Con la contraseña
// incorrecta (403) no cierra la sesión (plan, D11): el error va junto al campo. Un correo usado
// muestra el mensaje del registro. Sin conexión no se pide nada.
export default function ChangeEmailPage() {
    const navigation = useNavigation();
    const profile = useProfile();
    const { email: cambiar } = useAccount();
    const styles = useThemedStyles(makeStyles);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errores, setErrores] = useState<EmailFormErrors>({});
    const [aviso, setAviso] = useState<{ offline: boolean; texto: string } | null>(null);

    const onGuardar = () => {
        const validacion = validarCambioCorreo({ email, password });
        setErrores(validacion);
        setAviso(null);
        if (Object.keys(validacion).length > 0) return;

        cambiar.mutate(
            { email: email.trim(), password },
            {
                onSuccess: (perfil) => {
                    Alert.alert("Correo actualizado", `Desde ahora inicias sesión con ${perfil.email}.`, [
                        { text: "Aceptar", onPress: () => navigation.goBack() },
                    ]);
                },
                onError: (fallo) => {
                    if (esContrasenaIncorrecta(fallo)) {
                        setErrores({ password: mensajeDeCuenta(fallo) });
                        return;
                    }
                    const campos = erroresDeCuenta(fallo);
                    if (campos.email || campos.password) {
                        setErrores({ email: campos.email, password: campos.password });
                        return;
                    }
                    setAviso({ offline: "offline" in fallo, texto: mensajeDeCuenta(fallo) });
                },
            }
        );
    };

    return (
        <KeyboardScreen style={styles.container}>
            <ScreenHeader title="Cambiar correo" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Appear>
                    {aviso && (
                        <Notice
                            type={aviso.offline ? "offline" : "error"}
                            title={aviso.offline ? "Sin conexión" : "No se pudo cambiar el correo"}
                            description={aviso.texto}
                            onClose={() => setAviso(null)}
                        />
                    )}
                </Appear>
                {!!profile.data?.email && (
                    <Text style={styles.actual}>Correo actual: {profile.data.email}</Text>
                )}
                <TextField
                    label="Correo nuevo"
                    value={email}
                    onChangeText={(texto) => {
                        setEmail(texto);
                        if (errores.email) setErrores({ ...errores, email: undefined });
                    }}
                    error={errores.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                />
                <TextField
                    label="Contraseña"
                    helper="Para confirmar que eres tú."
                    value={password}
                    onChangeText={(texto) => {
                        setPassword(texto);
                        if (errores.password) setErrores({ ...errores, password: undefined });
                    }}
                    error={errores.password}
                    secureTextEntry
                    autoComplete="current-password"
                />
            </ScrollView>
            <BottomBar>
                <PrimaryButton
                    text={cambiar.isPending ? "Guardando..." : "Cambiar correo"}
                    onPress={onGuardar}
                    disabled={cambiar.isPending}
                />
            </BottomBar>
        </KeyboardScreen>
    );
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    content: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    actual: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
});
