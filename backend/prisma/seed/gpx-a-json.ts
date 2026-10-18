// Spec 006 — T6b (plan D8). Convierte las trazas GPX reales de gpx/ en rutas-ejemplo.json.
// Se ejecuta con Node 24, sin dependencias: `npm run seed:rutas:generar`.
//   - gpx/ (ignorado por git): los GPX originales, descargados de Wikiloc por el equipo.
//   - rutas-ejemplo.fuentes.json: nombre, tipo, región y dificultad de cada archivo.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = import.meta.dirname;
const MAX_PUNTOS = 40;
// Subidas menores que esto se toman como ruido del GPS (plan D8).
const HISTERESIS_M = 5;
// Espacio de nombres fijo para que cada archivo dé siempre el mismo UUID (CA-20).
const NAMESPACE = '6f1c2b8e-0d3a-4c55-9a77-5e0b1e2c3d40';
const RADIO_TIERRA_M = 6_371_008.8;

type Fuente = {
  archivo: string;
  name: string;
  type: 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
  region: string;
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME';
};

type Punto = { lat: number; lng: number; ele: number | null };

function leerGpx(xml: string) {
  const puntos: Punto[] = [];
  const re = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g;
  for (const [, attrs, cuerpo] of xml.matchAll(re)) {
    const lat = Number(/lat="([^"]+)"/.exec(attrs)?.[1]);
    const lng = Number(/lon="([^"]+)"/.exec(attrs)?.[1]);
    const ele = /<ele>([^<]+)<\/ele>/.exec(cuerpo)?.[1];
    puntos.push({ lat, lng, ele: ele === undefined ? null : Number(ele) });
  }
  // El GPX de Wikiloc trae el perfil del autor, no su nombre.
  const enlace = /<link href="([^"]+)"/.exec(xml)?.[1] ?? null;
  return { puntos, enlace };
}

const rad = (g: number) => (g * Math.PI) / 180;

function haversine(a: Punto, b: Punto) {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function distanciaTotal(puntos: Punto[]) {
  let total = 0;
  for (let i = 1; i < puntos.length; i++)
    total += haversine(puntos[i - 1], puntos[i]);
  return total;
}

// Suma solo las subidas que superan la histéresis desde el último valle.
function desnivelPositivo(puntos: Punto[]) {
  const alturas = puntos
    .map((p) => p.ele)
    .filter((e): e is number => e !== null);
  if (alturas.length === 0) return 0;
  let ganancia = 0;
  let ref = alturas[0];
  for (const e of alturas) {
    if (e - ref >= HISTERESIS_M) {
      ganancia += e - ref;
      ref = e;
    } else if (ref - e >= HISTERESIS_M) {
      ref = e;
    }
  }
  return ganancia;
}

// Douglas-Peucker en metros (proyección equirectangular local).
function simplificar(puntos: Punto[], toleranciaM: number): Punto[] {
  const lat0 = rad(puntos[0].lat);
  const xy = puntos.map((p) => [
    rad(p.lng) * Math.cos(lat0) * RADIO_TIERRA_M,
    rad(p.lat) * RADIO_TIERRA_M,
  ]);
  const conservar = new Array<boolean>(puntos.length).fill(false);
  conservar[0] = conservar[puntos.length - 1] = true;
  const pila: [number, number][] = [[0, puntos.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop()!;
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[j];
    const largo = Math.hypot(x2 - x1, y2 - y1);
    let max = -1;
    let k = -1;
    for (let m = i + 1; m < j; m++) {
      const [x, y] = xy[m];
      const d =
        largo === 0
          ? Math.hypot(x - x1, y - y1)
          : Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1)) / largo;
      if (d > max) [max, k] = [d, m];
    }
    if (max > toleranciaM) {
      conservar[k] = true;
      pila.push([i, k], [k, j]);
    }
  }
  return puntos.filter((_, i) => conservar[i]);
}

// La menor tolerancia que deja como máximo 40 puntos: el trazo más fiel posible (D3, D8).
function simplificarHasta(puntos: Punto[], max: number) {
  let bajo = 0;
  let alto = 10_000;
  let mejor = simplificar(puntos, alto);
  for (let i = 0; i < 40; i++) {
    const medio = (bajo + alto) / 2;
    const r = simplificar(puntos, medio);
    if (r.length <= max) {
      mejor = r;
      alto = medio;
    } else {
      bajo = medio;
    }
  }
  return mejor;
}

// UUID v5 (RFC 9562): mismo archivo → mismo id.
function uuidV5(nombre: string) {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(ns).update(nombre).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const redondear = (n: number, dec: number) =>
  Math.round(n * 10 ** dec) / 10 ** dec;

const fuentes = JSON.parse(
  readFileSync(join(DIR, 'rutas-ejemplo.fuentes.json'), 'utf8'),
) as Fuente[];

const rutas = fuentes.map((f) => {
  const { puntos, enlace } = leerGpx(
    readFileSync(join(DIR, 'gpx', f.archivo), 'utf8'),
  );
  if (puntos.length < 2) throw new Error(`${f.archivo}: el GPX no tiene traza`);
  const path = simplificarHasta(puntos, MAX_PUNTOS).map(
    (p) => [redondear(p.lng, 5), redondear(p.lat, 5)] as [number, number],
  );
  return {
    id: uuidV5(f.archivo),
    name: f.name,
    type: f.type,
    difficulty: f.difficulty,
    region: f.region,
    description: `Traza de un usuario de Wikiloc${enlace ? ` (${enlace})` : ''}. Recorrido simplificado; no sirve para navegar.`,
    distanceMeters: Math.round(distanciaTotal(puntos)),
    elevationGainMeters: Math.round(desnivelPositivo(puntos)),
    source: {
      platform: 'Wikiloc',
      author: 'Usuario de Wikiloc',
      url: enlace,
      file: f.archivo,
    },
    path,
  };
});

writeFileSync(
  join(DIR, 'rutas-ejemplo.json'),
  JSON.stringify(rutas, null, 2) + '\n',
);
console.log(`${rutas.length} rutas escritas en rutas-ejemplo.json`);
for (const r of rutas) {
  console.log(
    `  ${r.name}: ${r.path.length} puntos, ${(r.distanceMeters / 1000).toFixed(1)} km, ${r.elevationGainMeters} m`,
  );
}
