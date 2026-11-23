-- Spec 012 — T4. Borra una sola vez las actividades guardadas con menos de 3 puntos válidos
-- (CA-25, RN-5, plan D4). Solo borra datos: el esquema no cambia.
--
-- Punto válido = precisión de 20 m o mejor, o sin precisión: la regla isAccurate de
-- src/activity/distancia.ts (RN-1, plan D1). Desde esta versión el servidor ya no acepta
-- actividades así (CA-26), de modo que no vuelven a aparecer.
--
-- En cascada: sus activity_points se borran (ON DELETE CASCADE) y, si alguna era el origen de
-- una ruta publicada, routes."sourceActivityId" queda en NULL (ON DELETE SET NULL) y la ruta
-- no cambia. Las sesiones de seguridad no dependen de las actividades.
--
-- Antes de aplicarla en Supabase, revisar qué borra con prisma/consultas/actividades_cortas.sql
-- (plan R1, T17). Los nombres de tabla van sin esquema a propósito: la prueba
-- test/migracion-actividades-cortas.e2e-spec.ts corre este mismo archivo sobre tablas de prueba.

DELETE FROM "activities" AS a
WHERE (
  SELECT count(*)
  FROM "activity_points" AS p
  WHERE p."activityId" = a."id"
    AND (p."accuracyMeters" IS NULL OR p."accuracyMeters" <= 20)
) < 3;
