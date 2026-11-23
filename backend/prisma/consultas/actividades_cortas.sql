-- Spec 012 — T4/T17. Solo lectura: qué borraría la migración 20261123000000_borrar_actividades_cortas.
-- Mismo criterio que la migración: menos de 3 puntos con "accuracyMeters" IS NULL o <= 20.
-- Correr en el editor SQL de Supabase antes de `prisma migrate deploy` y confirmar el resultado
-- con el usuario (plan R1).

-- 1. Resumen por cuenta.
WITH cortas AS (
  SELECT a."id", a."userId"
  FROM "activities" AS a
  WHERE (
    SELECT count(*)
    FROM "activity_points" AS p
    WHERE p."activityId" = a."id"
      AND (p."accuracyMeters" IS NULL OR p."accuracyMeters" <= 20)
  ) < 3
)
SELECT u."email",
       count(*) AS actividades_a_borrar
FROM cortas AS c
JOIN "users" AS u ON u."id" = c."userId"
GROUP BY u."email"
ORDER BY actividades_a_borrar DESC, u."email";

-- 2. Detalle: cada actividad con su fecha, sus puntos y si es el origen de una ruta.
SELECT a."id",
       u."email",
       a."type",
       a."startedAt",
       a."distanceMeters",
       (SELECT count(*) FROM "activity_points" AS p WHERE p."activityId" = a."id") AS puntos,
       v.validos AS puntos_validos,
       r."id" AS ruta_de_origen
FROM "activities" AS a
JOIN "users" AS u ON u."id" = a."userId"
CROSS JOIN LATERAL (
  SELECT count(*) AS validos
  FROM "activity_points" AS p
  WHERE p."activityId" = a."id"
    AND (p."accuracyMeters" IS NULL OR p."accuracyMeters" <= 20)
) AS v
LEFT JOIN "routes" AS r ON r."sourceActivityId" = a."id"
WHERE v.validos < 3
ORDER BY u."email", a."startedAt" DESC;
