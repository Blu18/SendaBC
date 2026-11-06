import { useState } from "react";
import { View, ScrollView, StyleSheet, Text } from "react-native";
import Appear from "../../components/ui/Appear";
import { type RegistroFieldErrors, useRegistrar } from "../../hooks/auth/auth.hooks";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { StackActions, useNavigation } from "@react-navigation/native";
import ScreenHeader from "../../components/ui/ScreenHeader";
import TextField from "../../components/ui/TextField";
import Notice from "../../components/ui/Notice";
import type { Theme } from "../../lib/theme";
import { useThemedStyles } from "../../hooks/theme/useTheme";

type RegistroFieldError = Record<RegistroFieldErrors["field"], string>;

const emptyFieldErrors: RegistroFieldError = {
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MIN_DISPLAY_NAME_LENGTH = 5;

function validarCampos(values: {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): RegistroFieldError {
  const errors: RegistroFieldError = { ...emptyFieldErrors };

  // RN-4: los espacios al inicio y al final no cuentan.
  if (!values.displayName.trim()) {
    errors.displayName = "El usuario es obligatorio";
  } else if (values.displayName.trim().length < MIN_DISPLAY_NAME_LENGTH) {
    errors.displayName = `Debe tener al menos ${MIN_DISPLAY_NAME_LENGTH} caracteres`;
  }

  if (!values.email.trim()) {
    errors.email = "El correo es obligatorio";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Ingresa un correo válido";
  }

  if (!values.password) {
    errors.password = "La contraseña es obligatoria";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return errors;
}

export default function Register() {
    const [email, setEmail] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<RegistroFieldError>(emptyFieldErrors);
    const [serverError, setServerError] = useState<string>('');

    const registrar = useRegistrar();
    const navigation = useNavigation();
    const styles = useThemedStyles(makeStyles);

    const handleSubmit = () => {
      const errors = validarCampos({ displayName, email, password, confirmPassword });
      setFieldErrors(errors);
      setServerError('');

      const hayErrores = Object.values(errors).some((mensaje) => mensaje !== "");
      if (hayErrores) return;

      registrar.mutate(
        { displayName: displayName.trim(), email: email, password: password },
        {
          // CA-7: Login reemplaza a Register (atrás no regresa al formulario) y muestra la confirmación.
          onSuccess: () => navigation.dispatch(
            StackActions.replace('Login', { emailRegistrado: email.trim().toLowerCase() })
          ),
          // CA-4: el mensaje del servidor (p. ej. el 409) se muestra en pantalla;
          // los errores por campo del 400 se muestran junto a su campo.
          onError: (error) => {
            setFieldErrors({ ...emptyFieldErrors, ...error.fieldErrors });
            setServerError(error.message);
          }
        }
      )
    }

    return (
      <View style={styles.container}>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Text style={styles.title} accessibilityRole="header">Crea tu cuenta</Text>
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
              label="Usuario"
              onChangeText={setDisplayName}
              value={displayName}
              helper="Así te verán en las rutas que publiques."
              error={fieldErrors.displayName}
            />
            <TextField
              label="Contraseña"
              onChangeText={setPassword}
              value={password}
              secureTextEntry={true}
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            <TextField
              label="Confirmar contraseña"
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              secureTextEntry={true}
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
            />
            {/* CA-4: el mensaje del servidor (p. ej. el 409), como descripción del aviso */}
            <Appear>
              {!!serverError && (
                <Notice type="error" title="No se pudo crear la cuenta" description={serverError} />
              )}
            </Appear>
          </View>
          <View style={styles.actions}>
            <PrimaryButton
              text={registrar.isPending ? "Registrando..." : "Registrarse"}
              onPress={handleSubmit}
              disabled={registrar.isPending}
            />
            <TextBtn text="Ya tengo una cuenta" onPress={() => navigation.navigate('Login')}/>
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
      gap: t.spacing.md,
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
