// Spec 011 — T42. Recalcula la distancia de las actividades con puntos del principio de más
// de 30 s antes de su inicio, sin esos puntos (CA-17, RN-11, plan D7). Se ejecuta con Node 24,
// que entiende TypeScript sin compilar, como el seed de rutas:
//   npm run datos:recalcular-distancias              → solo informa qué cambiaría
//   npm run datos:recalcular-distancias -- --aplicar → guarda los cambios
// Solo cambia la distancia de la actividad y, si hay una ruta publicada desde ella, la
// distancia y la dificultad de la ruta (spec 007, RN-6). La actividad no cambia de estado.
// Correrlo dos veces da lo mismo: la segunda vez no encuentra diferencias.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type ActivityType } from '@prisma/client';
import { computeDistance } from '../../src/activity/distancia.ts';
import { dificultadDe } from '../../src/route/difficulty.ts';
import {
  MARGEN_PUNTO_VIEJO_MS,
  sinPuntosViejos,
} from '../../src/route/recorrido.ts';

// Diferencias menores no cuentan: son redondeo del Float de la base.
const TOLERANCIA_M = 0.01;

const aplicar = process.argv.includes('--aplicar');

const db = new PrismaClient({
  adapter: new PrismaPg(process.env['DATABASE_URL']!),
});

type Afectada = {
  id: string;
  type: ActivityType;
  startedAt: Date;
  distanceMeters: number | null;
  email: string;
  routeId: string | null;
  routeName: string | null;
  routeDistance: number | null;
  routeElevation: number | null;
  routeDifficulty: string | null;
};

type Punto = {
  lat: number;
  lng: number;
  altitudeMeters: number | null;
  accuracyMeters: number | null;
  sequence: number;
  recordedAt: Date;
};

const metros = (m: number | null) =>
  m === null ? '—' : `${(m / 1000).toFixed(3)} km`;

async function main() {
  const segundos = MARGEN_PUNTO_VIEJO_MS / 1000;
  // Las que tienen al menos un punto viejo. sinPuntosViejos decide después cuáles quitar.
  const afectadas = await db.$queryRaw<Afectada[]>`
    SELECT a.id, a.type, a."startedAt", a."distanceMeters", u.email,
           r.id AS "routeId", r.name AS "routeName", r."distanceMeters" AS "routeDistance",
           r."elevationGainMeters" AS "routeElevation", r.difficulty::text AS "routeDifficulty"
    FROM activities a
    JOIN users u ON u.id = a."userId"
    LEFT JOIN routes r ON r."sourceActivityId" = a.id
    WHERE EXISTS (SELECT 1 FROM activity_points p
                  WHERE p."activityId" = a.id
                    AND p."recordedAt" < a."startedAt" - make_interval(secs => ${segundos}))
    ORDER BY a."startedAt"`;

  let cambios = 0;
  for (const a of afectadas) {
    const guardados = await db.$queryRaw<Punto[]>`
      SELECT ST_Y(location) AS lat, ST_X(location) AS lng, "altitudeMeters",
             "accuracyMeters", sequence, "recordedAt"
      FROM activity_points
      WHERE "activityId" = ${a.id}::uuid
      ORDER BY sequence`;
    const puntos = sinPuntosViejos(guardados, a.startedAt);
    const distancia = computeDistance(
      puntos.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
        accuracy: p.accuracyMeters,
        recordedAt: p.recordedAt.toISOString(),
      })),
    );

    const cambiaActividad =
      a.distanceMeters === null ||
      Math.abs(a.distanceMeters - distancia) > TOLERANCIA_M;
    const cambiaRuta =
      a.routeId !== null &&
      (a.routeDistance === null ||
        Math.abs(a.routeDistance - distancia) > TOLERANCIA_M);
    if (!cambiaActividad && !cambiaRuta) continue;
    cambios++;

    const dificultad =
      a.routeId === null
        ? null
        : dificultadDe(a.type, distancia, a.routeElevation ?? 0);
    console.log(
      `${a.id} (${a.email}, ${a.startedAt.toISOString()}): ` +
        `${guardados.length - puntos.length} puntos viejos, ` +
        `${metros(a.distanceMeters)} → ${metros(distancia)}`,
    );
    if (a.routeId !== null) {
      console.log(
        `  ruta ${a.routeId} "${a.routeName}": ${metros(a.routeDistance)} → ` +
          `${metros(distancia)}, dificultad ${a.routeDifficulty} → ${dificultad}`,
      );
    }

    if (!aplicar) continue;
    // Solo las columnas de RN-11: ni el estado ni las demás métricas. Se usa SQL para no
    // tocar "updatedAt" de la actividad.
    await db.$transaction([
      db.$executeRaw`
        UPDATE activities SET "distanceMeters" = ${distancia}
        WHERE id = ${a.id}::uuid`,
      ...(a.routeId === null
        ? []
        : [
            db.$executeRaw`
              UPDATE routes
              SET "distanceMeters" = ${distancia},
                  difficulty = ${dificultad}::"RouteDifficulty",
                  "updatedAt" = now()
              WHERE id = ${a.routeId}::uuid`,
          ]),
    ]);
  }

  console.log(
    `\n${afectadas.length} actividades con puntos viejos, ${cambios} con distancia distinta. ` +
      (aplicar
        ? 'Cambios guardados.'
        : 'Modo informe: no se guardó nada (usa --aplicar).'),
  );
}

await main();
await db.$disconnect();
