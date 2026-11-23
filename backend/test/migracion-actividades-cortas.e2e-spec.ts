import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

// Spec 012 — T4 (CA-25). Corre la migración 20261123000000_borrar_actividades_cortas y la
// consulta de T17 sobre tablas de prueba, sin tocar las de verdad.
//
// Todo pasa en una transacción que siempre termina en ROLLBACK:
// - se crea un esquema propio con copias mínimas de users, activities, activity_points y routes,
//   con las mismas llaves foráneas (CASCADE y SET NULL) que las tablas reales;
// - SET LOCAL search_path apunta solo a ese esquema, así que los nombres sin esquema de los
//   archivos SQL se resuelven ahí. Antes de borrar se comprueba que "activities" es la del
//   esquema de prueba; si no, la prueba falla sin correr la migración.

const MIGRACION = readFileSync(
  join(
    import.meta.dirname,
    '../prisma/migrations/20261123000000_borrar_actividades_cortas/migration.sql',
  ),
  'utf8',
);
const CONSULTA = readFileSync(
  join(import.meta.dirname, '../prisma/consultas/actividades_cortas.sql'),
  'utf8',
);

type Caso = {
  nombre: string;
  precisiones: (number | null)[];
  seQueda: boolean;
};

// Precisión de cada punto, en metros; null = sin precisión, que cuenta como válido.
const CASOS: Caso[] = [
  { nombre: 'sin puntos', precisiones: [], seQueda: false },
  { nombre: '2 válidos', precisiones: [4, 8], seQueda: false },
  { nombre: '3 con 1 impreciso', precisiones: [4, 25, 8], seQueda: false },
  {
    nombre: '3 válidos (20 m y null)',
    precisiones: [4, 20, null],
    seQueda: true,
  },
  { nombre: '3 válidos de 5', precisiones: [30, 4, 50, 5, 6], seQueda: true },
  { nombre: 'origen de ruta, 1 válido', precisiones: [4, 40], seQueda: false },
];

describe('Migración borrar_actividades_cortas (e2e, spec 012, CA-25)', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const esquema = `prueba_t4_${randomUUID().replaceAll('-', '')}`;
  const ids = new Map(CASOS.map((c) => [c.nombre, randomUUID()]));
  const rutaId = randomUUID();
  const email = 'corta@senda.bc';

  beforeAll(async () => {
    await client.connect();
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${esquema}`);
    await client.query(`SET LOCAL search_path TO ${esquema}`);
    await client.query(`
      CREATE TABLE "users" ("id" uuid PRIMARY KEY, "email" text NOT NULL);
      CREATE TABLE "activities" (
        "id" uuid PRIMARY KEY,
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" text NOT NULL DEFAULT 'HIKING',
        "startedAt" timestamptz NOT NULL DEFAULT now(),
        "distanceMeters" float8
      );
      CREATE TABLE "activity_points" (
        "id" bigserial PRIMARY KEY,
        "activityId" uuid NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
        "accuracyMeters" float8
      );
      CREATE TABLE "routes" (
        "id" uuid PRIMARY KEY,
        "name" text NOT NULL,
        "sourceActivityId" uuid UNIQUE REFERENCES "activities"("id") ON DELETE SET NULL
      );`);

    const userId = randomUUID();
    await client.query('INSERT INTO "users" VALUES ($1, $2)', [userId, email]);
    for (const caso of CASOS) {
      const id = ids.get(caso.nombre)!;
      await client.query(
        'INSERT INTO "activities" ("id", "userId") VALUES ($1, $2)',
        [id, userId],
      );
      for (const precision of caso.precisiones) {
        await client.query(
          'INSERT INTO "activity_points" ("activityId", "accuracyMeters") VALUES ($1, $2)',
          [id, precision],
        );
      }
    }
    await client.query('INSERT INTO "routes" VALUES ($1, $2, $3)', [
      rutaId,
      'Ruta publicada',
      ids.get('origen de ruta, 1 válido'),
    ]);

    // Guarda: los archivos SQL deben resolver a las tablas de prueba, nunca a public.
    const { rows } = await client.query<{ nspname: string }>(`
      SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.oid = '"activities"'::regclass`);
    expect(rows[0].nspname).toBe(esquema);
  });

  afterAll(async () => {
    await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
  });

  const cortas = CASOS.filter((c) => !c.seQueda);
  const quedan = CASOS.filter((c) => c.seQueda);

  it('la consulta de T17 lista exactamente lo que se va a borrar, por cuenta y en detalle', async () => {
    const [resumen, detalle] = (await client.query(CONSULTA)) as unknown as {
      rows: Record<string, unknown>[];
    }[];

    expect(resumen.rows).toEqual([
      { email, actividades_a_borrar: String(cortas.length) },
    ]);
    expect(detalle.rows.map((r) => r.id).sort()).toEqual(
      cortas.map((c) => ids.get(c.nombre)).sort(),
    );
    const deRuta = detalle.rows.find(
      (r) => r.id === ids.get('origen de ruta, 1 válido'),
    );
    expect(deRuta).toMatchObject({
      puntos: '2',
      puntos_validos: '1',
      ruta_de_origen: rutaId,
    });
  });

  it('borra las actividades con menos de 3 puntos válidos y conserva las demás', async () => {
    const res = await client.query(MIGRACION);
    expect(res.rowCount).toBe(cortas.length);

    const { rows } = await client.query<{ id: string }>(
      'SELECT "id" FROM "activities"',
    );
    expect(rows.map((r) => r.id).sort()).toEqual(
      quedan.map((c) => ids.get(c.nombre)).sort(),
    );
  });

  it('los puntos de las borradas se van en cascada y los de las demás quedan', async () => {
    const { rows } = await client.query<{ activityId: string; n: string }>(
      'SELECT "activityId", count(*) AS n FROM "activity_points" GROUP BY 1',
    );
    expect(
      Object.fromEntries(rows.map((r) => [r.activityId, Number(r.n)])),
    ).toEqual(
      Object.fromEntries(
        quedan.map((c) => [ids.get(c.nombre), c.precisiones.length]),
      ),
    );
  });

  it('la ruta publicada desde una actividad corta se conserva con sourceActivityId en NULL', async () => {
    const { rows } = await client.query(
      'SELECT "name", "sourceActivityId" FROM "routes" WHERE "id" = $1',
      [rutaId],
    );
    expect(rows).toEqual([{ name: 'Ruta publicada', sourceActivityId: null }]);
  });

  it('correrla otra vez no borra nada más', async () => {
    const res = await client.query(MIGRACION);
    expect(res.rowCount).toBe(0);
  });
});
