import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import { deleteRouteDetail, getRouteDetail, saveRouteDetail } from '../../lib/db/routeCache';
import { getRoute } from '../../lib/routes/api';
import { consultarDetalle } from '../../lib/routes/offline';
import { routeDetailStatus, type RouteDetailOutcome } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Detalle de una ruta (spec 007, CA-10 a CA-14). El recorrido completo y el perfil se descargan
// solo aquí, no en el mapa del catálogo (requisito de datos móviles).
//
// Cada detalle que responde se guarda para la cuenta. Sin conexión, o si la petición no llega al
// servidor, se muestra el guardado con su fecha (spec 011, CA-55; plan, D3); sin él, el aviso
// de que necesita internet (CA-57). Un 404 lo borra (CA-59). Editar necesita conexión (CA-58),
// así que la pantalla de edición pasa `usarGuardado: false` y nunca recibe datos guardados.
export function useRouteDetail(id: string, { usarGuardado = true }: { usarGuardado?: boolean } = {}) {
  const { token, userId } = useAuth();

  const query = useQuery({
    queryKey: ['routes', 'detail', id, userId, usarGuardado],
    enabled: token !== null && userId !== null,
    // El usuario reintenta con el botón; sin reintentos automáticos el aviso aparece pronto.
    retry: false,
    queryFn: async (): Promise<RouteDetailOutcome> =>
      consultarDetalle({
        conectado: hayConexion(await Network.getNetworkStateAsync()),
        pedir: () => getRoute(token!, id),
        leer: async () => (usarGuardado ? getRouteDetail(userId!, id) : null),
        guardar: (route) => saveRouteDetail(userId!, route),
        borrar: () => deleteRouteDetail(userId!, id),
      }),
  });

  const { refetch } = query;
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const data = query.data;
  return {
    route: data?.kind === 'found' || data?.kind === 'saved' ? data.route : null,
    // Fecha de los datos guardados que se están mostrando, para el aviso (CA-55).
    savedAt: data?.kind === 'saved' ? data.savedAt : null,
    status: routeDetailStatus({ isFetching: query.isFetching, isError: query.isError, data }),
    retry,
  };
}
