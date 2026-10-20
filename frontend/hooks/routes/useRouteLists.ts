import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import {
  listFavorites,
  listMyRoutes,
  type FavoriteRoute,
  type MyRoute,
  type RouteResult,
} from '../../lib/routes/api';
import { routeListStatus, type RouteListOutcome } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Una lista de la cuenta, guardada en el servidor (spec 007, CA-17): sin conexión no se pide.
function useRouteList<T>(
  key: 'mine' | 'favorites',
  fetchList: (token: string) => Promise<RouteResult<T[]>>
) {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ['routes', key],
    enabled: token !== null,
    retry: false,
    queryFn: async (): Promise<RouteListOutcome<T>> => {
      if (!hayConexion(await Network.getNetworkStateAsync())) return { offline: true };
      const result = await fetchList(token!);
      if (!result.ok) throw result.failure;
      return { offline: false, items: result.data };
    },
  });

  const { refetch } = query;
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const data = query.data;
  return {
    items: data && !data.offline ? data.items : [],
    status: routeListStatus({ isFetching: query.isFetching, isError: query.isError, data }),
    retry,
  };
}

// "Mis rutas", la más reciente primero (CA-21). También dice si una actividad ya tiene ruta,
// por su sourceActivityId (plan D7).
export function useMyRoutes() {
  const { items, ...rest } = useRouteList<MyRoute>('mine', listMyRoutes);
  return { routes: items, ...rest };
}

// "Mis favoritas", la guardada más reciente primero (CA-18, CA-19).
export function useFavorites() {
  const { items, ...rest } = useRouteList<FavoriteRoute>('favorites', listFavorites);
  return { favorites: items, ...rest };
}
