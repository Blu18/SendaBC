import { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import TextField from "../../components/ui/TextField";
import { useAccount } from "../../hooks/account/useAccount";
import { erroresDeCuenta, esContrasenaIncorrecta, mensajeDeCuenta } from "../../lib/account/api";
import { validarCambioContrasena, type PasswordFormErrors } from "../../lib/account/credentials";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

// Cambiar la contraseña (spec 011, CA-44, CA-45). La nueva se confirma, como en el registro.
// Con la actual incorrecta (403) no cambia nada ni cierra la sesión (plan, D11). La sesión de
// este teléfono sigue abierta; las de otros también (plan, D6).
export default function ChangePasswordPage() {
    const navigation = useNavigation();
    const { password: cambiar } = useAccount();
    const styles = useThemedStyles(makeStyles);

    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [errores, setErrores] = useState<PasswordFormErrors>({});
    const [aviso, setAviso] = useState<{ offline: boolean; texto: string } | null>(null);

    const limpiar = (campo: keyof PasswordFormErrors) => {
        if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
    };

    const onGuardar = () => {
        const validacion = validarCambioContrasena({ actual, nueva, confirmar });
        setErrores(validacion);
        setAviso(null);
        if (Object.keys(validacion).length > 0) return;

        cambiar.mutate(
            { currentPassword: actual, newPassword: nueva },
            {
                onSuccess: () => {
                    Alert.alert("Contraseña actualizada", "La próxima vez inicia sesión con la nueva.", [
                        { text: "Aceptar", onPress: () => navigation.goBack() },
                    ]);
                },
                onError: (fallo) => {
                    if (esContrasenaIncorrecta(fallo)) {
                        setErrores({ actual: mensajeDeCuenta(fallo) });
                        return;
                    }
                    const campos = erroresDeCuenta(fallo);
                    if (campos.currentPassword || campos.newPassword) {
                        setErrores({ actual: campos.currentPassword, nueva: campos.newPassword });
                        return;
                    }
                    setAviso({ offline: "offline" in fallo, texto: mensajeDeCuenta(fallo) });
                },
            }
        );
    };

    return (
        <View style={styles.container}>
            <ScreenHeader title="Cambiar contraseña" onBack={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Appear>
                    {aviso && (
                        <Notice
                            type={aviso.offline ? "offline" : "error"}
                            title={aviso.offline ? "Sin conexión" : "No se pudo cambiar la contraseña"}
                            description={aviso.texto}
                            onClose={() => setAviso(null)}
                        />
                    )}
                </Appear>
                <TextField
                    label="Contraseña actual"
                    value={actual}
                    onChangeText={(texto) => {
                        setActual(texto);
                        limpiar("actual");
                    }}
                    error={errores.actual}
                    secureTextEntry
                    autoComplete="current-password"
                />
                <TextField
                    label="Contraseña nueva"
                    helper="Al menos 8 caracteres."
                    value={nueva}
                    onChangeText={(texto) => {
                        setNueva(texto);
                        limpiar("nueva");
                    }}
                    error={errores.nueva}
                    secureTextEntry
                    autoComplete="new-password"
                />
                <TextField
                    label="Confirma la contraseña nueva"
                    value={confirmar}
                    onChangeText={(texto) => {
                        setConfirmar(texto);
                        limpiar("confirmar");
                    }}
                    error={errores.confirmar}
                    secureTextEntry
                    autoComplete="new-password"
                />
            </ScrollView>
            <View style={styles.actions}>
                <PrimaryButton
                    text={cambiar.isPending ? "Guardando..." : "Cambiar contraseña"}
                    onPress={onGuardar}
                    disabled={cambiar.isPending}
                />
            </View>
        </View>
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
    actions: {
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surface,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
});
