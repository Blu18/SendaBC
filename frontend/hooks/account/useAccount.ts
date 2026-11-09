import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import {
  conConexion,
  deleteAccount,
  updateEmail,
  updatePassword,
  updateProfile,
  type AccountFailure,
  type AccountResult,
  type EmailChange,
  type PasswordChange,
  type Profile,
  type ProfileChanges,
} from '../../lib/account/api';

// Cambios de perfil y de cuenta (spec 011, CA-41 a CA-46). Sin conexión no se hace la petición y
// el error es { offline: true } (CA-45); mensajeDeCuenta() lo explica. Al cambiar el perfil o el
// correo se invalida ['profile'], así Inicio muestra el nombre y el avatar nuevos.
// Borrar la cuenta solo llama al servidor: la pantalla borra después los datos locales y cierra
// la sesión (T21).
export function useAccount() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const ejecutar = useCallback(
    async <T>(peticion: (token: string) => Promise<AccountResult<T>>): Promise<T> => {
      if (!token) throw { error: new Error('Sin sesión') } satisfies AccountFailure;
      const red = await Network.getNetworkStateAsync();
      const result = await conConexion(red, () => peticion(token));
      if (!result.ok) throw result.failure;
      return result.data;
    },
    [token]
  );

  const refrescarPerfil = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
    [queryClient]
  );

  const profile = useMutation<Profile, AccountFailure, ProfileChanges>({
    mutationFn: (changes) => ejecutar((t) => updateProfile(t, changes)),
    onSuccess: refrescarPerfil,
  });

  const email = useMutation<Profile, AccountFailure, EmailChange>({
    mutationFn: (change) => ejecutar((t) => updateEmail(t, change)),
    onSuccess: refrescarPerfil,
  });

  const password = useMutation<void, AccountFailure, PasswordChange>({
    mutationFn: (change) => ejecutar((t) => updatePassword(t, change)),
  });

  const remove = useMutation<void, AccountFailure, string>({
    mutationFn: (pass) => ejecutar((t) => deleteAccount(t, pass)),
  });

  return { profile, email, password, remove };
}
