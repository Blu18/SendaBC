import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import { getRoute } from '../../lib/routes/api';
import {
  routeDetailOutcome,
  routeDetailStatus,
  type RouteDetailOutcome,
} from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Detalle de una ruta (spec 007, CA-10 a CA-14). El recorrido completo y el perfil se descargan
// solo aquí, no en el mapa del catálogo (requisito de datos móviles).
export function useRouteDetail(id: string) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ['routes', 'detail', id],
    enabled: token !== null,
    // El usuario reintenta con el botón; sin reintentos automáticos el aviso aparece pronto.
    retry: false,
    queryFn: async (): Promise<RouteDetailOutcome> => {
      if (!hayConexion(await Network.getNetworkStateAsync())) return { kind: 'offline' };
      return routeDetailOutcome(await getRoute(token!, id));
    },
  });

  const { refetch } = query;
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const data = query.data;
  return {
    route: data?.kind === 'found' ? data.route : null,
    status: routeDetailStatus({ isFetching: query.isFetching, isError: query.isError, data }),
    retry,
  };
}
