import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import {
  getFavorites,
  getSavedDetailIds,
  saveFavorites,
  saveRouteDetail,
} from '../../lib/db/routeCache';
import type { Guardado } from '../../lib/db/routeCache';
import {
  getRoute,
  listFavorites,
  listMyRoutes,
  type FavoriteRoute,
  type MyRoute,
  type RouteResult,
} from '../../lib/routes/api';
import { consultarConRespaldo, descargarDetallesDeFavoritas } from '../../lib/routes/offline';
import { routeListStatus, type RouteListOutcome } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Cómo guardar y leer una lista para consultarla sin conexión (spec 011, CA-56). Sin respaldo,
// la lista necesita conexión, como antes ("Mis rutas", CA-58).
type Respaldo<T> = {
  leer: (userId: string) => Promise<Guardado<T[]> | null>;
  guardar: (userId: string, token: string, items: T[]) => Promise<void>;
};

// Una lista de la cuenta, guardada en el servidor (spec 007, CA-17): sin conexión no se pide.
function useRouteList<T>(
  key: 'mine' | 'favorites',
  fetchList: (token: string) => Promise<RouteResult<T[]>>,
  respaldo?: Respaldo<T>
) {
  const { token, userId } = useAuth();

  const query = useQuery({
    queryKey: ['routes', key, userId],
    enabled: token !== null && userId !== null,
    retry: false,
    queryFn: async (): Promise<RouteListOutcome<T>> => {
      const resultado = await consultarConRespaldo({
        conectado: hayConexion(await Network.getNetworkStateAsync()),
        pedir: () => fetchList(token!),
        leer: async () => (respaldo ? respaldo.leer(userId!) : null),
        guardar: async (items) => respaldo?.guardar(userId!, token!, items),
      });
      if (!resultado.offline) return { offline: false, items: resultado.data };
      return resultado.saved ? { offline: true, saved: resultado.saved } : { offline: true };
    },
  });

  const { refetch } = query;
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const data = query.data;
  return {
    items: !data ? [] : data.offline ? (data.saved?.data ?? []) : data.items,
    // Fecha de la lista guardada que se está mostrando, para el aviso (CA-56).
    savedAt: data?.offline ? (data.saved?.savedAt ?? null) : null,
    status: routeListStatus({ isFetching: query.isFetching, isError: query.isError, data }),
    retry,
  };
}

// "Mis rutas", la más reciente primero (CA-21). También dice si una actividad ya tiene ruta,
// por su sourceActivityId (plan D7). Necesita conexión (spec 011, CA-58).
export function useMyRoutes() {
  const { items, ...rest } = useRouteList<MyRoute>('mine', listMyRoutes);
  return { routes: items, ...rest };
}

// Una sola descarga de detalles a la vez: la lista se refresca también después de quitar o
// guardar una favorita.
let descargandoDetalles = false;

const respaldoDeFavoritas: Respaldo<FavoriteRoute> = {
  leer: getFavorites,
  guardar: async (userId, token, favoritas) => {
    await saveFavorites(userId, favoritas);
    if (descargandoDetalles) return;
    descargandoDetalles = true;
    // En segundo plano: la lista se muestra sin esperar los detalles (CA-55).
    (async () => {
      try {
        await descargarDetallesDeFavoritas({
          favoritas,
          guardadas: await getSavedDetailIds(userId),
          pedir: (id) => getRoute(token, id),
          guardar: (route) => saveRouteDetail(userId, route),
        });
      } catch (e) {
        console.log('No se pudieron descargar los detalles de las favoritas:', e);
      } finally {
        descargandoDetalles = false;
      }
    })();
  },
};

// "Mis favoritas", la guardada más reciente primero (CA-18, CA-19). Sin conexión, las de la
// última vez que hubo (spec 011, CA-56).
export function useFavorites() {
  const { items, ...rest } = useRouteList<FavoriteRoute>('favorites', listFavorites, respaldoDeFavoritas);
  return { favorites: items, ...rest };
}
