import { useState } from "react";
import { View, TextInput, StyleSheet, Text } from "react-native";
import { LoginFieldErrors, useLogin } from "../../hooks/auth/auth.hooks";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";

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
        <View style={styles.header}>
          <Text style={styles.headerText}>SendaBC</Text>
        </View>
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.headerFormText}>Inicio de Sesión</Text>
          </View>
          {!!emailRegistrado && (
            <Text style={styles.successText}>Tu cuenta se creó correctamente. Inicia sesión para continuar.</Text>
          )}
          <View style={styles.inputContainer}>
            <View>
              <TextInput
                placeholder="Correo"
                onChangeText={setEmail}
                value={email}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              {!!fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}
            </View>
            <View>
            </View>
            <View>
              <TextInput
                placeholder="Contraseña"
                onChangeText={setPassword}
                value={password}
                secureTextEntry={true}
                style={styles.input}
              />
              {!!fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
            </View>
          </View>
          <View style={styles.formFooter}>
            {!!serverError && <Text style={styles.serverErrorText}>{serverError}</Text>}
            <PrimaryButton
              text={login.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
              onPress={handleSubmit}
              disabled={login.isPending}
            />
            <TextBtn 
              text="¿Aun no tienes cuenta? Crea una" 
              textStyle={{textDecorationLine: 'underline'}}
              onPress={() => navigation.navigate('Register')}
            />
          </View>
        </View>
      </View>
    )
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#EDEAE1",
      width: '100%',
      alignItems: 'center',
      gap: 24
    },
    header: {
      width: '100%',
      height: '25%',
      backgroundColor: "#5C6B49",
      borderBottomEndRadius: 15,
      borderBottomStartRadius:15,
      alignItems: 'center',
      justifyContent: 'center'
    },
    headerText: {
      fontSize: 42,
      color: "#EDEAE1",
      fontWeight: 'bold'
    },
    formContainer: {
      width: '90%',
      padding: 12,
    },
    formHeader: {
      paddingVertical: 18
    },
    headerFormText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: "#2B2A26"
    },  
    inputContainer: {
      gap: 16,
    },  
    input: {
      color: '#444444',
      fontSize: 16,
      borderRadius: 8,
      borderColor: "#5C6B49",
      borderWidth: 1.5,
    },
    successText: {
      color: "#5C6B49",
      fontSize: 14,
      marginBottom: 12,
    },
    errorText: {
      color: "#B3261E",
      fontSize: 13,
      marginTop: 4,
    },
    serverErrorText: {
      color: "#B3261E",
      fontSize: 14,
      textAlign: 'center',
    },
    formFooter: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 48
    },
});