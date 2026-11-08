import type { ActivityType } from '../db/activities';
import type { Guardado } from '../db/routeCache';
import { haversineMeters, type Coordinates } from '../metrics/geo';
import type { FavoriteRoute, NearbyRoute, RouteDetail } from './api';
import { detalleSinConexion, noLlegoAlServidor, sinConexion, type RouteDetailOutcome } from './status';

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

// Detalle de una ruta (CA-55, CA-57, CA-59). Como consultarConRespaldo, y además un 404 (ruta
// archivada o borrada) borra el detalle guardado y la muestra como no disponible (spec 007,
// CA-14). Sin conexión y sin el detalle guardado es 'offline', con el mensaje de que necesita
// internet (CA-57).
export async function consultarDetalle(o: {
  conectado: boolean;
  pedir: () => Promise<Resultado<RouteDetail>>;
  leer: () => Promise<Guardado<RouteDetail> | null>;
  guardar: (route: RouteDetail) => Promise<void>;
  borrar: () => Promise<void>;
}): Promise<RouteDetailOutcome> {
  try {
    const r = await consultarConRespaldo(o);
    return r.offline ? detalleSinConexion(r.saved ?? null) : { kind: 'found', route: r.data };
  } catch (failure) {
    if (!esNoEncontrada(failure)) throw failure;
    try {
      await o.borrar();
    } catch (e) {
      console.log('No se pudo borrar la ruta guardada:', e);
    }
    return { kind: 'unavailable' };
  }
}

function esNoEncontrada(failure: unknown): boolean {
  return typeof failure === 'object' && failure !== null && 'status' in failure && failure.status === 404;
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

// Una favorita que nunca se abrió también debe verse sin conexión (CA-55): al refrescar la lista
// con red se descarga el detalle de las favoritas disponibles que no estén guardadas. Una por una,
// para no saturar la red; un fallo en una no detiene las demás. Una favorita que ya no está
// disponible no tiene detalle (spec 007, CA-19). Devuelve cuántas se guardaron.
export async function descargarDetallesDeFavoritas(o: {
  favoritas: FavoriteRoute[];
  guardadas: Set<string>;
  pedir: (id: string) => Promise<Resultado<RouteDetail>>;
  guardar: (route: RouteDetail) => Promise<void>;
}): Promise<number> {
  let guardadas = 0;
  for (const f of o.favoritas) {
    if (!f.available || o.guardadas.has(f.id)) continue;
    try {
      const r = await o.pedir(f.id);
      if (!r.ok) {
        // Sin red no tiene caso seguir pidiendo; las demás se intentan en el siguiente refresco.
        if (noLlegoAlServidor(r.failure)) break;
        continue;
      }
      await o.guardar(r.data);
      guardadas++;
    } catch (e) {
      console.log('No se pudo guardar el detalle de una favorita:', e);
    }
  }
  return guardadas;
}
