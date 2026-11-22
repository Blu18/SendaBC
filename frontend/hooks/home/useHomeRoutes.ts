import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useAuth } from '../../context/AuthContext';
import {
  HOME_NEARBY_LIMIT,
  HOME_NEARBY_RADIUS_KM,
  esSinConexion,
  homeRoutesStatus,
  type HomeRoutesOutcome,
} from '../../lib/home/routes';
import type { Coordinates } from '../../lib/metrics/geo';
import { fetchNearbyRoutes, fetchPopularRoutes, type NearbyRoute, type PopularRoute } from '../../lib/routes/api';
import { hayConexion } from '../../lib/sync/network';

// Una posición reciente basta y es casi inmediata, como en Explorar (spec 006, M4).
const MAX_EDAD_POSICION_MS = 5 * 60_000;

async function posicionActual(): Promise<Coordinates> {
  const reciente = await Location.getLastKnownPositionAsync({ maxAge: MAX_EDAD_POSICION_MS });
  const { coords } = reciente ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitude: coords.latitude, longitude: coords.longitude };
}

async function conectado() {
  return hayConexion(await Network.getNetworkStateAsync());
}

// Las consultas de Inicio no se guardan en el teléfono (plan D6): la última búsqueda guardada es
// la de Explorar (spec 011, RN-14). Sus claves empiezan con 'routes', así que guardar o quitar una
// favorita las vuelve a pedir (useRouteMutations, CA-17). Al volver la red o la app al frente se
// repiten solas (spec 011, F7; CA-22).
function resultado<T>(query: { data: HomeRoutesOutcome<T> | undefined; isError: boolean; refetch: () => unknown }) {
  const data = query.data;
  return {
    items: data?.kind === 'ok' ? data.items : [],
    status: homeRoutesStatus(query),
    retry: () => void query.refetch(),
  };
}

// Hasta 5 rutas publicadas a 25 km o menos, la más cercana primero (CA-9). Lee el permiso de
// ubicación sin pedirlo (CA-11): sin permiso, la sección lo explica. La ubicación solo se usa como
// centro de la consulta y no se guarda (constitución 3.5).
export function useNearbyHome() {
  const { token, userId } = useAuth();
  const query = useQuery({
    queryKey: ['routes', 'home-nearby', userId],
    enabled: token !== null && userId !== null,
    retry: false,
    queryFn: async (): Promise<HomeRoutesOutcome<NearbyRoute>> => {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted) return { kind: 'noPermission' };
      if (!(await conectado())) return { kind: 'offline' };
      const center = await posicionActual();
      const r = await fetchNearbyRoutes(
        token!,
        { center, radiusKm: HOME_NEARBY_RADIUS_KM, type: null },
        { limit: HOME_NEARBY_LIMIT }
      );
      if (r.ok) return { kind: 'ok', items: r.data };
      if (esSinConexion(r.failure)) return { kind: 'offline' };
      throw new Error(`Rutas cercanas: ${'status' in r.failure ? r.failure.status : 'error'}`);
    },
  });
  return resultado(query);
}

// Las 5 rutas con más favoritas de todo Baja California (CA-13, RN-6). Una lista vacía significa
// que ninguna tiene favoritas y la sección se oculta (CA-15).
export function usePopularRoutes() {
  const { token, userId } = useAuth();
  const query = useQuery({
    queryKey: ['routes', 'popular', userId],
    enabled: token !== null && userId !== null,
    retry: false,
    queryFn: async (): Promise<HomeRoutesOutcome<PopularRoute>> => {
      if (!(await conectado())) return { kind: 'offline' };
      const r = await fetchPopularRoutes(token!);
      if (r.ok) return { kind: 'ok', items: r.data };
      if (esSinConexion(r.failure)) return { kind: 'offline' };
      throw new Error(`Rutas populares: ${'status' in r.failure ? r.failure.status : 'error'}`);
    },
  });
  return resultado(query);
}
