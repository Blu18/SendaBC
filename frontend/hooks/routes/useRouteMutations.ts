import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import {
  addFavorite,
  deleteRoute,
  publishRoute,
  removeFavorite,
  updateRoute,
  type PublishRouteInput,
  type RouteChanges,
  type RouteDetail,
  type RouteResult,
} from '../../lib/routes/api';
import type { RouteActionFailure } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Publicar, editar, archivar o volver a publicar, borrar y favoritas (spec 007). Sin conexión
// no se hace la petición y el error es { offline: true } (CA-7); mensajeDeFallo() lo explica.
// Al terminar, con éxito o no, se invalida ['routes']: el catálogo, el detalle y las listas se
// refrescan juntos.
export function useRouteMutations() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const ejecutar = useCallback(
    async <T>(peticion: (token: string) => Promise<RouteResult<T>>): Promise<T> => {
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
    () => queryClient.invalidateQueries({ queryKey: ['routes'] }),
    [queryClient]
  );

  const publish = useMutation<RouteDetail, RouteActionFailure, PublishRouteInput>({
    mutationFn: (input) => ejecutar((t) => publishRoute(t, input)),
    onSettled,
  });

  // Editar nombre, descripción y zona (CA-22), o cambiar el estado: archivar (CA-23) y volver a
  // publicar (CA-24).
  const update = useMutation<
    RouteDetail,
    RouteActionFailure,
    { id: string; changes: RouteChanges }
  >({
    mutationFn: ({ id, changes }) => ejecutar((t) => updateRoute(t, id, changes)),
    onSettled,
  });

  const remove = useMutation<void, RouteActionFailure, string>({
    mutationFn: (id) => ejecutar((t) => deleteRoute(t, id)),
    onSettled,
  });

  // save: true guarda, false quita (CA-15, CA-16).
  const favorite = useMutation<void, RouteActionFailure, { id: string; save: boolean }>({
    mutationFn: ({ id, save }) =>
      ejecutar((t) => (save ? addFavorite(t, id) : removeFavorite(t, id))),
    onSettled,
  });

  return { publish, update, remove, favorite };
}
