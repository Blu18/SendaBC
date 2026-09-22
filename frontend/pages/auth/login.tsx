import { useState } from "react";
import { View, TextInput, StyleSheet, Text } from "react-native";
import { LoginFieldErrors, useLogin } from "../../hooks/auth/auth.hooks";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useNavigation } from "@react-navigation/native";

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

export default function Login() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<LoginFieldError>(emptyFieldErrors);

    const login = useLogin();
    const navigation = useNavigation();

    const handleSubmit = () => {
      const errors = validarCampos({ email, password });
      setFieldErrors(errors);

      const hayErrores = Object.values(errors).some((mensaje) => mensaje !== "");
      if (hayErrores) return;

      login.mutate(
        { email: email, password: password},
        {
          onSuccess: () => navigation.navigate('MainPage'),
          onError: (error) => {console.log(error.message);}
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
            <PrimaryButton text="Iniciar Sesión" onPress={handleSubmit}/>
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
    errorText: {
      color: "#B3261E",
      fontSize: 13,
      marginTop: 4,
    },
    formFooter: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 48
    },
});