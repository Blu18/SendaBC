import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import { fetchNearbyRoutes, type NearbySearch } from '../../lib/routes/api';
import { nearbyStatus, type NearbyOutcome } from '../../lib/routes/status';
import { hayConexion } from '../../lib/sync/network';

// Rutas cercanas bajo demanda (spec 006, D6): solo busca cuando la pantalla llama a search(),
// no en cada movimiento del mapa.
export function useNearbyRoutes() {
  const { token } = useAuth();
  // `n` distingue búsquedas repetidas con los mismos parámetros ("Buscar en esta zona" dos
  // veces en el mismo lugar): cada una vuelve a pedir y no muestra datos guardados (CA-15).
  const [search, setSearch] = useState<(NearbySearch & { n: number }) | null>(null);

  const query = useQuery({
    queryKey: ['routes', 'nearby', search],
    enabled: search !== null && token !== null,
    // El usuario reintenta con el botón; sin reintentos automáticos el error aparece pronto.
    retry: false,
    gcTime: 0,
    queryFn: async (): Promise<NearbyOutcome> => {
      if (!hayConexion(await Network.getNetworkStateAsync())) return { offline: true };
      const result = await fetchNearbyRoutes(token!, search!);
      if (!result.ok) throw result.failure;
      return { offline: false, routes: result.data };
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
    routes: data && !data.offline ? data.routes : [],
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
