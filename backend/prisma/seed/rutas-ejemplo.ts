// Spec 006 — T6. Carga o quita las rutas de ejemplo de Baja California (CA-18 a CA-20).
// Se ejecuta con Node 24, que entiende TypeScript sin compilar (plan D5):
//   npm run seed:rutas          → crea el usuario del sistema y carga/actualiza las rutas
//   npm run seed:rutas:quitar   → borra solo esas rutas y al usuario del sistema
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import rutas from './rutas-ejemplo.json' with { type: 'json' };

// Autor de las rutas de ejemplo (plan D2). Su nombre es lo que la app muestra (CA-19).
const CATALOGO_EMAIL = 'catalogo@senda.bc';
const CATALOGO_NOMBRE = 'SendaBC';

type RutaEjemplo = {
  id: string;
  name: string;
  type: 'HIKING' | 'TRAIL_RUNNING' | 'CYCLING';
  difficulty: 'EASY' | 'MODERATE' | 'HARD' | 'EXTREME'; // calculada con RN-6 (spec 007)
  region: string;
  description: string;
  distanceMeters: number; // medida sobre la traza GPX completa (D8)
  elevationGainMeters: number;
  path: [number, number][]; // [longitud, latitud]
  elevationProfile: [number, number][]; // [distancia m, altitud m], de la traza completa (spec 007, RN-8)
};

const db = new PrismaClient({
  adapter: new PrismaPg(process.env['DATABASE_URL']!),
});

async function cargar() {
  // Contraseña aleatoria que no se guarda en ningún lado: nadie puede iniciar sesión con este
  // usuario (constitución 3.6). El trigger de la base la convierte en hash bcrypt.
  const catalogo = await db.user.upsert({
    where: { email: CATALOGO_EMAIL },
    create: {
      email: CATALOGO_EMAIL,
      displayName: CATALOGO_NOMBRE,
      passwordHash: randomBytes(32).toString('base64url'),
    },
    update: {},
  });

  // Mismo id fijo → actualiza en lugar de duplicar (CA-20). La distancia viene del JSON, medida
  // sobre la traza GPX completa, no del recorrido simplificado; el catálogo no la recalcula (RN-3).
  // El JSON se infiere con `type: string` y `path: number[][]`; su forma la garantiza
  // rutas-ejemplo.spec.ts.
  for (const ruta of rutas as unknown as RutaEjemplo[]) {
    const geojson = JSON.stringify({
      type: 'LineString',
      coordinates: ruta.path,
    });
    await db.$executeRaw`
      INSERT INTO routes (id, name, type, status, difficulty, description, region,
                          "elevationGainMeters", "createdByUserId", "updatedAt",
                          path, "startPoint", "distanceMeters", "elevationProfile")
      SELECT ${ruta.id}::uuid, ${ruta.name}, ${ruta.type}::"ActivityType", 'PUBLISHED',
             ${ruta.difficulty}::"RouteDifficulty", ${ruta.description}, ${ruta.region},
             ${ruta.elevationGainMeters}, ${catalogo.id}::uuid, now(),
             g.path, ST_StartPoint(g.path)::geography, ${ruta.distanceMeters},
             ${JSON.stringify(ruta.elevationProfile)}::jsonb
      FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326) AS path) g
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        difficulty = EXCLUDED.difficulty,
        description = EXCLUDED.description,
        region = EXCLUDED.region,
        "elevationGainMeters" = EXCLUDED."elevationGainMeters",
        "updatedAt" = now(),
        path = EXCLUDED.path,
        "startPoint" = EXCLUDED."startPoint",
        "distanceMeters" = EXCLUDED."distanceMeters",
        "elevationProfile" = EXCLUDED."elevationProfile"`;
  }

  console.log(
    `${rutas.length} rutas de ejemplo cargadas como "${CATALOGO_NOMBRE}".`,
  );
}

async function quitar() {
  const catalogo = await db.user.findUnique({
    where: { email: CATALOGO_EMAIL },
  });
  if (!catalogo) {
    console.log('No hay rutas de ejemplo cargadas.');
    return;
  }
  // Primero sus rutas: la relación con el creador no se borra en cascada. Las favoritas de
  // esas rutas sí. No se toca nada de otros usuarios (CA-20).
  const { count } = await db.route.deleteMany({
    where: { createdByUserId: catalogo.id },
  });
  await db.user.delete({ where: { id: catalogo.id } });
  console.log(
    `${count} rutas de ejemplo y el usuario "${CATALOGO_NOMBRE}" borrados.`,
  );
}

try {
  await (process.argv.includes('--quitar') ? quitar() : cargar());
} finally {
  await db.$disconnect();
}
