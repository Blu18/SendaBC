import { useState } from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import Appear from "../../components/ui/Appear";
import { LoginFieldErrors, useLogin } from "../../hooks/auth/auth.hooks";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import ScreenHeader from "../../components/ui/ScreenHeader";
import TextField from "../../components/ui/TextField";
import Notice from "../../components/ui/Notice";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type LoginFieldError = Record<LoginFieldErrors["field"], string>;

const emptyFieldErrors: LoginFieldError = {
    email: "",
    password: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validarCampos(values: {
  email: string;
  password: string;
}): LoginFieldError {
  const errors: LoginFieldError = { ...emptyFieldErrors };

  if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Ingresa un correo válido";
  }

  if (!values.password) {
    errors.password = "La contraseña es obligatoria";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }


  return errors;
}

// emailRegistrado llega al terminar el registro (spec 001, CA-7).
type Props = StaticScreenProps<{ emailRegistrado?: string } | undefined>;

export default function Login({ route }: Props) {
    const emailRegistrado = route.params?.emailRegistrado;
    const [email, setEmail] = useState<string>(emailRegistrado ?? '');
    const [password, setPassword] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<LoginFieldError>(emptyFieldErrors);
    const [serverError, setServerError] = useState<string>('');

    const login = useLogin();
    const navigation = useNavigation();
    const { login: guardarSesion } = useAuth();
    const styles = useThemedStyles(makeStyles);

    const handleSubmit = () => {
      const errors = validarCampos({ email, password });
      setFieldErrors(errors);
      setServerError('');

      const hayErrores = Object.values(errors).some((mensaje) => mensaje !== "");
      if (hayErrores) return;

      login.mutate(
        { email: email, password: password},
        {
          // CA-1: reset para que el botón atrás no regrese a Login.
          onSuccess: (payload) => guardarSesion(payload.token, payload.id).then(() =>
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
          ),
          // CA-2: "Credenciales invalidas" (o el error genérico sin conexión) visible en pantalla.
          onError: (error) => setServerError(error.message)
        }
      )
    }

    return (
      <View style={styles.container}>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Iniciar sesión</Text>
            <Appear>
              {!!emailRegistrado && (
                <Notice
                  type="info"
                  title="Cuenta creada"
                  description="Tu cuenta se creó correctamente. Inicia sesión para continuar."
                />
              )}
            </Appear>
            <TextField
              label="Correo"
              onChangeText={setEmail}
              value={email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              error={fieldErrors.email}
            />
            <TextField
              label="Contraseña"
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              autoComplete="current-password"
              error={fieldErrors.password}
            />
            {/* CA-2: el mensaje del servidor, como descripción del aviso */}
            <Appear>
              {!!serverError && (
                <Notice type="error" title="No se pudo iniciar sesión" description={serverError} />
              )}
            </Appear>
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              text={login.isPending ? "Iniciando sesión..." : "Iniciar sesión"}
              onPress={handleSubmit}
              disabled={login.isPending}
            />
            <TextBtn
              text="¿Aún no tienes cuenta? Crea una"
              onPress={() => navigation.navigate('Register')}
            />
          </View>
        </ScrollView>
      </View>
    )
}

const makeStyles = (t: Theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    // Los botones quedan abajo; con el teclado abierto todo se puede desplazar.
    scroll: {
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    content: {
      gap: t.spacing.lg,
      padding: t.spacing.lg,
    },
    title: {
      ...t.typography.headline,
      color: t.colors.text,
    },
    actions: {
      gap: t.spacing.sm,
      padding: t.spacing.lg,
    },
});
