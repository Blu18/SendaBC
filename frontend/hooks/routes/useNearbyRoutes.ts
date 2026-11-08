import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import { getNearby, saveNearby } from '../../lib/db/routeCache';
import { fetchNearbyRoutes, type NearbySearch } from '../../lib/routes/api';
import { consultarConRespaldo, guardadasDelTipo } from '../../lib/routes/offline';
import { nearbyStatus, type NearbyOutcome } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Rutas cercanas bajo demanda (spec 006, D6): solo busca cuando la pantalla llama a search(),
// no en cada movimiento del mapa. Cada búsqueda que responde se guarda como la última de la
// cuenta; sin conexión, o si la petición no llega al servidor, se muestra esa (spec 011, CA-53,
// D3). Sin nada guardado, el aviso de que explorar necesita internet (CA-54).
export function useNearbyRoutes() {
  const { token, userId } = useAuth();
  // `n` distingue búsquedas repetidas con los mismos parámetros ("Buscar en esta zona" dos
  // veces en el mismo lugar): cada una vuelve a pedir y no muestra la respuesta anterior de la
  // caché de consultas (CA-15).
  const [search, setSearch] = useState<(NearbySearch & { n: number }) | null>(null);

  const query = useQuery({
    queryKey: ['routes', 'nearby', userId, search],
    enabled: search !== null && token !== null && userId !== null,
    // El usuario reintenta con el botón; sin reintentos automáticos el error aparece pronto.
    retry: false,
    gcTime: 0,
    queryFn: async (): Promise<NearbyOutcome> => {
      const resultado = await consultarConRespaldo({
        conectado: hayConexion(await Network.getNetworkStateAsync()),
        pedir: () => fetchNearbyRoutes(token!, search!),
        leer: () => getNearby(userId!),
        guardar: (routes) => saveNearby(userId!, routes),
      });
      if (!resultado.offline) return { offline: false, routes: resultado.data };
      if (!resultado.saved) return { offline: true };
      // Sin conexión no se puede filtrar en el servidor: se filtra por tipo lo guardado.
      const { data, savedAt } = resultado.saved;
      return { offline: true, saved: { data: guardadasDelTipo(data, search!.type), savedAt } };
    },
  });

  const buscar = useCallback((params: NearbySearch) => {
    setSearch((prev) => ({ ...params, n: (prev?.n ?? 0) + 1 }));
  }, []);

  const { refetch } = query;
  const retry = useCallback(() => {
    refetch();
  }, [refetch]);

  const data = query.data;
  return {
    routes: !data ? [] : data.offline ? (data.saved?.data ?? []) : data.routes,
    // Fecha de los datos guardados que se están mostrando, para el aviso (CA-53).
    savedAt: data?.offline ? (data.saved?.savedAt ?? null) : null,
    status: nearbyStatus({
      requested: search !== null,
      isFetching: query.isFetching,
      isError: query.isError,
      data,
    }),
    // Centro y radio de la última búsqueda, para decidir si mostrar "Buscar en esta zona" (CA-9).
    lastSearch: search,
    search: buscar,
    retry,
  };
}
