// Spec 014 — T13. Crea o quita 200 actividades de ejemplo, con sus puntos, para una cuenta de
// prueba. Sirve para medir Mis actividades con muchas actividades (CA-20) y, al recuperarlas en
// el teléfono (spec 005, HU-5), para comprobar que traen perfil y miniatura (RN-10).
// Solo es herramienta de prueba: no cambia endpoints ni el esquema.
//
// Se ejecuta con Node 24, que entiende TypeScript sin compilar (spec 006, plan D5):
//   npm run seed:actividades          → crea la cuenta si no existe y reemplaza sus actividades
//   npm run seed:actividades:quitar   → borra la cuenta y todas sus actividades
//
// La cuenta sale de SEED_ACTIVIDADES_EMAIL y SEED_ACTIVIDADES_PASSWORD en el .env (constitución
// 3.6: nada de contraseñas en el repositorio). El trigger de la base guarda el hash bcrypt.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const TOTAL = 200;
const MESES = 14; // de hoy hacia atrás: incluye meses del año anterior (spec 014, CA-14)
const INTERVALO_S = 15; // un punto cada 15 s, como la grabación en primer plano
// Zona de Ensenada, donde están las rutas de ejemplo.
const CENTRO = { lat: 31.87, lng: -116.6 };

type Tipo = 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
type Punto = {
  sequence: number;
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  recordedAt: string;
};

// Velocidad (m/s) y distancia (km) de cada tipo.
const PERFIL: Record<Tipo, { velocidad: number; min: number; max: number }> = {
  HIKING: { velocidad: 1.2, min: 3, max: 15 },
  TRAIL_RUNNING: { velocidad: 2.6, min: 5, max: 21 },
  CYCLING: { velocidad: 6, min: 12, max: 55 },
};

// Números pseudoaleatorios con semilla: cada corrida crea las mismas actividades.
function rng(seed: number) {
  // Semilla mezclada: con semillas consecutivas, el primer valor de cada actividad salía casi igual.
  let s = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;
function haversine(a: Punto, b: Punto) {
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Un recorrido de ida y vuelta con curvas, que sube a una cumbre y regresa al inicio.
function actividad(i: number, ahora: number) {
  const random = rng(1000 + i);
  const tipos: Tipo[] = ['HIKING', 'HIKING', 'TRAIL_RUNNING', 'CYCLING'];
  const tipo = tipos[i % tipos.length];
  const perfil = PERFIL[tipo];
  const distanciaObjetivo = (perfil.min + random() * (perfil.max - perfil.min)) * 1000;
  const n = Math.max(20, Math.round(distanciaObjetivo / perfil.velocidad / INTERVALO_S));

  // Repartidas en los últimos MESES meses, a una hora de la mañana o de la tarde.
  const diasAtras = Math.floor((i / TOTAL) * MESES * 30.4 + random() * 3);
  const inicio = new Date(ahora - diasAtras * 86_400_000);
  inicio.setHours(random() < 0.7 ? 6 + Math.floor(random() * 3) : 16 + Math.floor(random() * 2), Math.floor(random() * 60), 0, 0);

  const lat0 = CENTRO.lat + (random() - 0.5) * 0.4;
  const lng0 = CENTRO.lng + (random() - 0.5) * 0.4;
  const rumbo = random() * 2 * Math.PI;
  const base = 150 + random() * 900;
  const subida = 80 + random() * (tipo === 'CYCLING' ? 900 : 700);
  const paso = distanciaObjetivo / n;
  const mLat = 111_320;
  const mLng = mLat * Math.cos(rad(CENTRO.lat));

  const puntos: Punto[] = [];
  let x = 0;
  let y = 0;
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    // Ida en la primera mitad y regreso en la segunda, con una curva suave.
    const sentido = t < 0.5 ? 1 : -1;
    const angulo = rumbo + Math.sin(t * Math.PI * 6) * 0.6 + (sentido < 0 ? Math.PI : 0);
    if (k > 0) {
      x += Math.cos(angulo) * paso;
      y += Math.sin(angulo) * paso;
    }
    const altitud =
      base + subida * Math.sin(Math.PI * t) + 25 * Math.sin(t * 23) + (random() - 0.5) * 6;
    puntos.push({
      sequence: k,
      latitude: lat0 + y / mLat + (random() - 0.5) * 0.00004,
      longitude: lng0 + x / mLng + (random() - 0.5) * 0.00004,
      altitude: altitud,
      accuracy: 4 + random() * 8,
      recordedAt: new Date(inicio.getTime() + k * INTERVALO_S * 1000).toISOString(),
    });
  }

  let distancia = 0;
  let ganada = 0;
  let perdida = 0;
  for (let k = 1; k < n; k++) {
    distancia += haversine(puntos[k - 1], puntos[k]);
    const d = puntos[k].altitude - puntos[k - 1].altitude;
    if (d > 0) ganada += d;
    else perdida -= d;
  }
  // El ruido del GPS no cuenta como subida (spec 004, CA-11): una aproximación suficiente aquí.
  const factor = subida * 2 / (ganada + perdida || 1);
  const duracion = (n - 1) * INTERVALO_S;

  return {
    tipo,
    inicio,
    fin: new Date(inicio.getTime() + duracion * 1000),
    duracion,
    distancia,
    ganada: ganada * factor,
    perdida: perdida * factor,
    puntos,
  };
}

const db = new PrismaClient({
  adapter: new PrismaPg(process.env['DATABASE_URL']!),
});

function cuenta() {
  const email = process.env['SEED_ACTIVIDADES_EMAIL'];
  const password = process.env['SEED_ACTIVIDADES_PASSWORD'];
  if (!email || !password) {
    throw new Error('Define SEED_ACTIVIDADES_EMAIL y SEED_ACTIVIDADES_PASSWORD en backend/.env.');
  }
  return { email, password };
}

async function cargar() {
  const { email, password } = cuenta();
  const usuario = await db.user.upsert({
    where: { email },
    create: { email, displayName: 'Prueba bitácora', passwordHash: password },
    update: {},
  });

  // Se reemplazan todas: cada corrida deja exactamente TOTAL actividades.
  await db.activity.deleteMany({ where: { userId: usuario.id } });

  const ahora = Date.now();
  let puntosTotales = 0;
  for (let i = 0; i < TOTAL; i++) {
    const a = actividad(i, ahora);
    await db.$transaction(async (tx) => {
      const { id } = await tx.activity.create({
        data: {
          clientGeneratedId: randomUUID(),
          userId: usuario.id,
          type: a.tipo,
          status: 'SYNCED',
          startedAt: a.inicio,
          endedAt: a.fin,
          distanceMeters: a.distancia,
          durationSeconds: a.duracion,
          elevationGainMeters: a.ganada,
          elevationLossMeters: a.perdida,
          elevationSource: 'GPS',
        },
        select: { id: true },
      });
      // Igual que la subida de la app (spec 005): un INSERT con arreglos y el recorrido como línea.
      await tx.$executeRaw`
        INSERT INTO activity_points
          ("activityId", sequence, location, "altitudeMeters", "accuracyMeters", "recordedAt")
        SELECT ${id}::uuid, p.sequence,
               ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326),
               p.altitude, p.accuracy, p.recorded_at
        FROM unnest(
          ${a.puntos.map((p) => p.sequence)}::int[],
          ${a.puntos.map((p) => p.latitude)}::float8[],
          ${a.puntos.map((p) => p.longitude)}::float8[],
          ${a.puntos.map((p) => p.altitude)}::float8[],
          ${a.puntos.map((p) => p.accuracy)}::float8[],
          ${a.puntos.map((p) => p.recordedAt)}::timestamptz[]
        ) AS p(sequence, latitude, longitude, altitude, accuracy, recorded_at)`;
      await tx.$executeRaw`
        UPDATE activities
        SET path = (SELECT ST_MakeLine(location ORDER BY sequence)
                    FROM activity_points WHERE "activityId" = ${id}::uuid)
        WHERE id = ${id}::uuid`;
    }, { timeout: 60_000 });
    puntosTotales += a.puntos.length;
    if ((i + 1) % 25 === 0) console.log(`${i + 1} de ${TOTAL} actividades…`);
  }
  console.log(`${TOTAL} actividades de ejemplo (${puntosTotales} puntos) para ${email}.`);
}

async function quitar() {
  const { email } = cuenta();
  const usuario = await db.user.findUnique({ where: { email } });
  if (!usuario) {
    console.log('No hay cuenta de prueba de actividades.');
    return;
  }
  // Sus actividades y puntos se borran en cascada.
  await db.user.delete({ where: { id: usuario.id } });
  console.log(`Cuenta ${email} y sus actividades borradas.`);
}

try {
  await (process.argv.includes('--quitar') ? quitar() : cargar());
} finally {
  await db.$disconnect();
}
