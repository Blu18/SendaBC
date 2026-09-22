import { useState } from "react";
import { View, TextInput, StyleSheet, Text, Pressable } from "react-native";
import { type RegistroFieldErrors, useRegistrar } from "../../hooks/auth/auth.hooks";
import PrimaryButton from "../../components/ui/buttons/PrimaryBtn";
import TextBtn from "../../components/ui/buttons/TextBtn";
import { useNavigation } from "@react-navigation/native";

type RegistroFieldError = Record<RegistroFieldErrors["field"], string>;

const emptyFieldErrors: RegistroFieldError = {
    displayName: "",
    email: "",
    passwordHash: "",
    confirmPassword: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validarCampos(values: {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): RegistroFieldError {
  const errors: RegistroFieldError = { ...emptyFieldErrors };

  if (!values.displayName.trim()) {
    errors.displayName = "El usuario es obligatorio";
  }

  if (!values.email.trim()) {
    errors.email = "El correo es obligatorio";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Ingresa un correo válido";
  }

  if (!values.password) {
    errors.passwordHash = "La contraseña es obligatoria";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.passwordHash = `Debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
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

    const registrar = useRegistrar();
    const navigation = useNavigation();

    const handleSubmit = () => {
      const errors = validarCampos({ displayName, email, password, confirmPassword });
      setFieldErrors(errors);

      const hayErrores = Object.values(errors).some((mensaje) => mensaje !== "");
      if (hayErrores) return;

      registrar.mutate(
        { displayName: displayName, email: email, passwordHash: password},
        {
          onSuccess: () => {console.log("Cuenta registrada correctamente")},
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
            <Text style={styles.headerFormText}>Crea tu cuenta</Text>
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
              <TextInput
                placeholder="Usuario"
                onChangeText={setDisplayName}
                value={displayName}
                style={styles.input}
              />
              {!!fieldErrors.displayName && <Text style={styles.errorText}>{fieldErrors.displayName}</Text>}
            </View>
            <View>
              <TextInput
                placeholder="Contraseña"
                onChangeText={setPassword}
                value={password}
                secureTextEntry={true}
                style={styles.input}
              />
              {!!fieldErrors.passwordHash && <Text style={styles.errorText}>{fieldErrors.passwordHash}</Text>}
            </View>
            <View>
              <TextInput
                placeholder="Confirmar contraseña"
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                secureTextEntry={true}
                style={styles.input}
              />
              {!!fieldErrors.confirmPassword && <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>}
            </View>
          </View>
          <View style={styles.formFooter}>
            <PrimaryButton text="Registrarse" onPress={handleSubmit}/>
            <TextBtn text="Ya tengo una cuenta" onPress={() => navigation.navigate('Login')}/>
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