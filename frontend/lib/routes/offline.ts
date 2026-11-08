import type { ActivityType } from '../db/activities';
import type { Guardado } from '../db/routeCache';
import { haversineMeters, type Coordinates } from '../metrics/geo';
import type { NearbyRoute } from './api';
import { noLlegoAlServidor, sinConexion } from './status';

// Consulta con respaldo para usar sin conexión (spec 011, CA-53 a CA-59; plan, D3). La usan los
// hooks de Explorar, el detalle y las favoritas. Sin imports de React Native, para probarla.
//
// - Sin conexión no se hace la petición y se devuelve lo guardado, o nada (CA-54, CA-57).
// - Una respuesta exitosa se guarda y se devuelve: con red los datos se actualizan (CA-59).
// - Si la petición no llegó al servidor, se usa lo guardado como sin conexión (D3). Sin nada
//   guardado, o con una respuesta del servidor que no es exitosa (un 5xx), el fallo se lanza
//   para que la query quede en error y se pueda reintentar.
export type ConRespaldo<T> = { offline: false; data: T } | { offline: true; saved?: Guardado<T> };

// Lo que devuelven lib/routes/api.ts y fetchNearbyRoutes: nunca lanzan.
type Resultado<T> = { ok: true; data: T } | { ok: false; failure: { status: number } | { error: unknown } };

export async function consultarConRespaldo<T>(o: {
  conectado: boolean;
  pedir: () => Promise<Resultado<T>>;
  leer: () => Promise<Guardado<T> | null>;
  guardar: (data: T) => Promise<void>;
}): Promise<ConRespaldo<T>> {
  if (!o.conectado) return sinConexion(await leerSinFallar(o.leer));

  const result = await o.pedir();
  if (result.ok) {
    // Guardar es secundario: si falla, la pantalla igual muestra lo que respondió el servidor.
    try {
      await o.guardar(result.data);
    } catch (e) {
      console.log('No se pudo guardar para consultar sin conexión:', e);
    }
    return { offline: false, data: result.data };
  }

  if (noLlegoAlServidor(result.failure)) {
    const saved = await leerSinFallar(o.leer);
    if (saved) return { offline: true, saved };
  }
  throw result.failure;
}

// Leer lo guardado tampoco debe romper la pantalla: sin poder leer, es como no tener nada.
async function leerSinFallar<T>(leer: () => Promise<Guardado<T> | null>) {
  try {
    return await leer();
  } catch (e) {
    console.log('No se pudo leer lo guardado para consultar sin conexión:', e);
    return null;
  }
}

// La búsqueda guardada es una sola (RN-14). Si sin conexión se elige un tipo, se muestran solo
// las guardadas de ese tipo, para no presentar rutas que no corresponden al filtro. El radio no
// se aplica: lo guardado ya es la búsqueda de un radio.
export function guardadasDelTipo(routes: NearbyRoute[], type: ActivityType | null): NearbyRoute[] {
  return type ? routes.filter((r) => r.type === type) : routes;
}

// La búsqueda guardada puede ser de otro lugar (por ejemplo, de casa antes de salir). Si ninguna
// ruta guardada empieza dentro del radio alrededor del centro actual, el mapa debe moverse hacia
// ellas para que se vean (CA-53).
export function guardadasFueraDeVista(
  routes: NearbyRoute[],
  center: Coordinates,
  radiusKm: number
): boolean {
  return routes.length > 0 && routes.every((r) => haversineMeters(center, r.start) > radiusKm * 1000);
}
