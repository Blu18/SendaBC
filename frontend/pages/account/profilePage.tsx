import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Appear from "../../components/ui/Appear";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import ScreenHeader from "../../components/ui/ScreenHeader";
import Notice from "../../components/ui/Notice";
import TextField from "../../components/ui/TextField";
import PressableScale from "../../components/ui/PressableScale";
import Avatar from "../../components/account/Avatar";
import Card from "../../components/ui/Card";
import { useProfile } from "../../hooks/auth/auth.hooks";
import { useAccount } from "../../hooks/account/useAccount";
import { AVATAR_POR_DEFECTO, AVATARS, type AvatarId } from "../../lib/account/avatars";
import { erroresDeCuenta, mensajeDeCuenta, type Profile } from "../../lib/account/api";
import { cambiosDePerfil, validarNombre } from "../../lib/account/profile";
import type { Theme } from "../../lib/theme";
import { useTheme, useThemedStyles } from "../../hooks/theme/useTheme";

// Opciones del selector: los 8 avatares y "Sin avatar" al final (RN-15).
const OPCIONES = [...AVATARS, AVATAR_POR_DEFECTO];

// Perfil (spec 011, CA-41, CA-42, CA-45): nombre visible y avatar, y acceso a cambiar el correo,
// la contraseña y borrar la cuenta. Se abre desde Inicio. Sin conexión no se guarda nada y se avisa; lo escrito se
// conserva si falla. "Guardar" solo guarda el nombre y el avatar.
export default function ProfilePage() {
    const navigation = useNavigation();
    const profile = useProfile();
    const { profile: guardar } = useAccount();
    const theme = useTheme();
    const styles = useThemedStyles(makeStyles);
    const header = <ScreenHeader title="Tu perfil" onBack={() => navigation.goBack()} />;

    const perfil = profile.data as Profile | undefined;
    const [nombre, setNombre] = useState("");
    const [avatar, setAvatar] = useState<AvatarId | null>(null);
    const [errorNombre, setErrorNombre] = useState<string | null>(null);
    const [aviso, setAviso] = useState<{ offline: boolean; texto: string } | null>(null);
    // El formulario se llena una sola vez: un refresco del perfil no borra lo que se escribió.
    const llenado = useRef(false);

    useEffect(() => {
        if (!perfil || llenado.current) return;
        llenado.current = true;
        setNombre(perfil.displayName);
        setAvatar((perfil.avatarId as AvatarId | null) ?? null);
    }, [perfil]);

    if (!perfil) {
        return (
            <View style={styles.container}>
                {header}
                {profile.isError ? (
                    <View style={styles.content}>
                        <Notice type="error" title="No se pudo cargar tu perfil" description="Revisa tu conexión e inténtalo de nuevo." />
                        <PrimaryButton text="Reintentar" onPress={() => void profile.refetch()} />
                    </View>
                ) : (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loading} />
                )}
            </View>
        );
    }

    const onGuardar = () => {
        const error = validarNombre(nombre);
        setErrorNombre(error);
        setAviso(null);
        if (error) return;

        const cambios = cambiosDePerfil(perfil, nombre, avatar);
        if (Object.keys(cambios).length === 0) {
            navigation.goBack();
            return;
        }
        guardar.mutate(cambios, {
            onSuccess: () => {
                Alert.alert("Perfil guardado", "Tu nombre y tu avatar se ven igual en cualquier teléfono.", [
                    { text: "Aceptar", onPress: () => navigation.goBack() },
                ]);
            },
            onError: (fallo) => {
                const campos = erroresDeCuenta(fallo);
                if (campos.displayName) {
                    setErrorNombre(campos.displayName);
                    return;
                }
                setAviso({ offline: "offline" in fallo, texto: mensajeDeCuenta(fallo) });
            },
        });
    };

    return (
        <View style={styles.container}>
            {header}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Appear>
                    {aviso && (
                        <Notice
                            type={aviso.offline ? "offline" : "error"}
                            title={aviso.offline ? "Sin conexión" : "No se pudo guardar"}
                            description={aviso.texto}
                            onClose={() => setAviso(null)}
                        />
                    )}
                </Appear>

                <View style={styles.preview}>
                    <Avatar avatarId={avatar} size={96} />
                    <Text style={styles.email}>{perfil.email}</Text>
                </View>

                <TextField
                    label="Nombre visible"
                    value={nombre}
                    onChangeText={(texto) => {
                        setNombre(texto);
                        if (errorNombre) setErrorNombre(null);
                    }}
                    error={errorNombre}
                    autoCapitalize="words"
                    maxLength={60}
                />

                <Text style={styles.sectionTitle} accessibilityRole="header">Avatar</Text>
                <View style={styles.grid} accessibilityRole="radiogroup">
                    {OPCIONES.map((opcion) => {
                        const elegido = opcion.id === avatar;
                        return (
                            <PressableScale
                                key={opcion.id ?? "ninguno"}
                                onPress={() => setAvatar(opcion.id)}
                                accessibilityRole="radio"
                                accessibilityLabel={opcion.label}
                                accessibilityState={{ selected: elegido, checked: elegido }}
                                style={[styles.option, elegido && styles.optionSelected]}
                                pressedStyle={styles.pressed}
                            >
                                <Avatar avatarId={opcion.id} size={56} />
                            </PressableScale>
                        );
                    })}
                </View>

                <Text style={styles.sectionTitle} accessibilityRole="header">Cuenta</Text>
                <Card
                    title="Cambiar correo"
                    description="Te pedimos tu contraseña para confirmarlo."
                    onPress={() => navigation.navigate("ChangeEmail")}
                />
                <Card
                    title="Cambiar contraseña"
                    onPress={() => navigation.navigate("ChangePassword")}
                />
                <Card
                    title="Borrar cuenta"
                    description="Borra tus datos del servidor y de este teléfono."
                    onPress={() => navigation.navigate("DeleteAccount")}
                />
            </ScrollView>
            <View style={styles.actions}>
                <PrimaryButton
                    text={guardar.isPending ? "Guardando..." : "Guardar"}
                    onPress={onGuardar}
                    disabled={guardar.isPending}
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
    loading: {
        marginTop: t.spacing.xxl,
    },
    content: {
        gap: t.spacing.lg,
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
    },
    preview: {
        alignItems: "center",
        gap: t.spacing.sm,
    },
    email: {
        ...t.typography.bodySmall,
        color: t.colors.textMuted,
    },
    sectionTitle: {
        ...t.typography.title,
        color: t.colors.text,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: t.spacing.md,
    },
    // 64 dp de toque alrededor del avatar de 56; el elegido lleva un anillo primary de 3 dp.
    option: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "transparent",
        overflow: "hidden",
    },
    optionSelected: {
        borderColor: t.colors.primary,
    },
    pressed: {
        ...StyleSheet.absoluteFill,
        backgroundColor: t.colors.primary,
        opacity: 0.12,
    },
    actions: {
        paddingHorizontal: t.spacing.lg,
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surface,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
});
