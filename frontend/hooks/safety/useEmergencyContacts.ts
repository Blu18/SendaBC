import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import { getContactsCache, replaceContactsCache } from '../../lib/db/safety';
import {
  createContact,
  deleteContact,
  listContacts,
  sendTestMessage,
  updateContact,
  type SafetyResult,
  type TestMessageResult,
} from '../../lib/safety/api';
import type { EmergencyContact } from '../../lib/safety/contacts';
import type { RouteActionFailure } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

export const CONTACTS_QUERY_KEY = ['safety', 'contacts'] as const;

// La lista y si viene de la copia del teléfono (sin conexión).
type ContactsOutcome = { offline: boolean; contacts: EmergencyContact[] };

export type ContactsStatus = 'loading' | 'success' | 'error';

// Contactos de emergencia de la cuenta (spec 008, CA-1 a CA-7). Con conexión se piden al servidor
// y se guarda una copia en SQLite; sin conexión se muestra esa copia, para que al iniciar una
// actividad se sepa si hay contactos activos (CA-8, CA-9). Se vuelven a pedir al regresar a la
// pantalla, para ver los que aceptaron mientras tanto.
export function useEmergencyContacts({ refetchOnFocus = true } = {}) {
  const { token, userId } = useAuth();

  const query = useQuery({
    queryKey: CONTACTS_QUERY_KEY,
    enabled: token !== null && userId !== null,
    retry: false,
    queryFn: async (): Promise<ContactsOutcome> => {
      const desdeCopia = async () => ({ offline: true, contacts: await getContactsCache(userId!) });
      if (!hayConexion(await Network.getNetworkStateAsync())) return desdeCopia();

      const result = await listContacts(token!);
      if (!result.ok) {
        // Sin respuesta del servidor también vale la copia; un 4xx/5xx es un error de verdad.
        if ('error' in result.failure) return desdeCopia();
        throw result.failure;
      }
      await replaceContactsCache(userId!, result.data);
      return { offline: false, contacts: result.data };
    },
  });

  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      if (refetchOnFocus) void refetch();
    }, [refetch, refetchOnFocus])
  );

  const status: ContactsStatus =
    query.data !== undefined ? 'success' : query.isError ? 'error' : 'loading';

  return {
    contacts: query.data?.contacts ?? [],
    offline: query.data?.offline ?? false,
    status,
    isFetching: query.isFetching,
    retry: refetch,
  };
}

// Agregar, editar, quitar y el mensaje de prueba (CA-1, CA-3, CA-6). Sin conexión no se hace la
// petición y el error es { offline: true }; mensajeDeFallo() de lib/routes/status lo explica
// (los fallos de la API de seguridad tienen la misma forma que los de rutas).
export function useContactMutations() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const ejecutar = useCallback(
    async <T>(peticion: (token: string) => Promise<SafetyResult<T>>): Promise<T> => {
      if (!hayConexion(await Network.getNetworkStateAsync())) {
        throw { offline: true } satisfies RouteActionFailure;
      }
      if (!token) throw { error: new Error('Sin sesión') } satisfies RouteActionFailure;
      const result = await peticion(token);
      if (!result.ok) throw result.failure;
      return result.data;
    },
    [token]
  );

  const onSettled = useCallback(
    () => queryClient.invalidateQueries({ queryKey: CONTACTS_QUERY_KEY }),
    [queryClient]
  );

  const create = useMutation<EmergencyContact, RouteActionFailure, string>({
    mutationFn: (name) => ejecutar((t) => createContact(t, name)),
    onSettled,
  });

  const rename = useMutation<EmergencyContact, RouteActionFailure, { id: string; name: string }>({
    mutationFn: ({ id, name }) => ejecutar((t) => updateContact(t, id, name)),
    onSettled,
  });

  const remove = useMutation<void, RouteActionFailure, string>({
    mutationFn: (id) => ejecutar((t) => deleteContact(t, id)),
    onSettled,
  });

  // Un envío fallido por Telegram es 200 con status FAILED; si el contacto lo bloqueó pasa a
  // "No recibe mensajes", por eso también se recarga la lista (CA-7).
  const test = useMutation<TestMessageResult, RouteActionFailure, string>({
    mutationFn: (id) => ejecutar((t) => sendTestMessage(t, id)),
    onSettled,
  });

  return { create, rename, remove, test };
}
