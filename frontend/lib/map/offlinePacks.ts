import Mapbox from '@rnmapbox/maps';
import './mapbox';
import {
  ZONE_MAX_ZOOM,
  ZONE_MIN_ZOOM,
  ZONE_STYLE_KEYS,
  boundsParaMapbox,
  nombreDePaquete,
  type PackInfo,
  type PackLive,
  type ZoneBounds,
  type ZoneMetadata,
  type ZoneStyle,
} from './offlineZones';
import { TERRAIN_URL, ZONE_STYLES } from './style';

// Envoltura de Mapbox.offlineManager para las zonas descargadas (spec 011, CA-32, CA-33; plan,
// D13, D14, R1). Cada zona son dos paquetes, claro y oscuro, con el relieve. Los paquetes son del
// teléfono, no de la cuenta (D2): siguen al cerrar sesión y al borrar la cuenta.
//
// Mapbox avisa el avance y los errores por paquete, con un solo oyente por nombre. Aquí se guarda
// lo último de cada paquete en `vivos` y se avisa a quien escuche, para que la descarga siga
// aunque se cierre la pantalla que la empezó.

const offline = Mapbox.offlineManager;

// Un aviso cada segundo basta para la barra de avance.
offline.setProgressEventThrottle(1000);

let vivos: Record<string, PackLive> = {};
const oyentes = new Set<() => void>();

// Cada cambio crea un objeto nuevo, para que useSyncExternalStore note el cambio.
function avisar() {
  vivos = { ...vivos };
  oyentes.forEach((o) => o());
}

export function escucharPaquetes(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function paquetesVivos(): Record<string, PackLive> {
  return vivos;
}

function alAvanzar(_pack: unknown, status: { name: string; state: string; percentage: number | null }) {
  vivos[status.name] = {
    state: status.state === 'complete' ? 'complete' : 'active',
    percentage: status.percentage,
  };
  avisar();
}

function alFallar(_pack: unknown, err: { name: string; message: string }) {
  console.log('Falló la descarga de una zona del mapa:', err.name, err.message);
  vivos[err.name] = { state: 'error', percentage: vivos[err.name]?.percentage ?? null };
  avisar();
}

async function crearPaquete(zoneId: string, style: ZoneStyle, bounds: ZoneBounds, createdAt: string) {
  const name = nombreDePaquete(zoneId, style);
  const metadata: ZoneMetadata = { zoneId, style, createdAt, bounds };
  vivos[name] = { state: 'active', percentage: 0 };
  avisar();
  try {
    await offline.createPack(
      {
        name,
        styleURL: ZONE_STYLES[style],
        bounds: boundsParaMapbox(bounds),
        minZoom: ZONE_MIN_ZOOM,
        maxZoom: ZONE_MAX_ZOOM,
        tilesets: [TERRAIN_URL],
        metadata,
      },
      alAvanzar,
      alFallar
    );
  } catch (e) {
    vivos[name] = { state: 'error', percentage: 0 };
    avisar();
    throw e;
  }
}

// Empieza a descargar una zona nueva. Quien llama ya revisó el tope y la conexión (CA-31, CA-34).
export async function descargarZona(bounds: ZoneBounds, ahora = new Date()): Promise<string> {
  const zoneId = `zona-${ahora.getTime()}`;
  for (const style of ZONE_STYLE_KEYS) await crearPaquete(zoneId, style, bounds, ahora.toISOString());
  return zoneId;
}

// Todos los paquetes del teléfono, con su avance y lo que ocupan.
export async function listarPaquetes(): Promise<PackInfo[]> {
  const packs = await offline.getPacks();
  const infos: PackInfo[] = [];
  for (const pack of packs) {
    try {
      const s = await pack.status();
      infos.push({
        name: pack.name,
        metadata: (pack.metadata ?? {}) as Partial<ZoneMetadata>,
        complete: s.completedResourceCount === s.requiredResourceCount && s.requiredResourceCount > 0,
        percentage: s.percentage ?? null,
        sizeBytes: s.completedResourceSize ?? 0,
      });
    } catch (e) {
      console.log('No se pudo leer el estado de un paquete del mapa:', pack.name, e);
    }
  }
  return infos;
}

// Reintenta una zona incompleta (CA-32): reanuda sus paquetes y crea el que falte, si la app se
// cerró entre uno y otro. Mapbox solo baja lo que no tiene.
export async function reintentarZona(o: {
  zoneId: string;
  bounds: ZoneBounds;
  createdAt: string;
  missingStyles: ZoneStyle[];
}) {
  for (const style of ZONE_STYLE_KEYS) {
    const name = nombreDePaquete(o.zoneId, style);
    if (o.missingStyles.includes(style)) {
      await crearPaquete(o.zoneId, style, o.bounds, o.createdAt);
      continue;
    }
    const pack = await offline.getPack(name);
    if (!pack) continue;
    vivos[name] = { state: 'active', percentage: vivos[name]?.percentage ?? null };
    avisar();
    await offline.subscribe(name, alAvanzar, alFallar);
    try {
      await pack.resume();
    } catch (e) {
      vivos[name] = { state: 'error', percentage: vivos[name]?.percentage ?? null };
      avisar();
      throw e;
    }
  }
}

// Borra la zona (CA-33): sale de la lista y deja de contar para el tope. Mapbox no libera el
// disco al momento, y mientras no lo haga el mapa la sigue mostrando sin red; bajar `disk-quota`
// no lo acelera (T34, R1).
export async function borrarZona(zoneId: string) {
  for (const style of ZONE_STYLE_KEYS) {
    const name = nombreDePaquete(zoneId, style);
    offline.unsubscribe(name);
    await offline.deletePack(name);
    delete vivos[name];
  }
  avisar();
}
