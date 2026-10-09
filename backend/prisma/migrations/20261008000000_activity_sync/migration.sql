-- Spec 005 — T1. Sincronización de actividades.
-- Las tablas activities, activity_points y routes estaban vacías al crear esta migración (2026-10-09).

-- CreateEnum
CREATE TYPE "ElevationSource" AS ENUM ('BAROMETER', 'GPS');

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "elevationSource" "ElevationSource";

-- Geometrías tipadas en WGS84 (constitución 5.2). Prisma no genera estos cambios porque las
-- columnas son Unsupported. 0_init las creó como "geometry" sin tipo; en Supabase ya tenían
-- SRID 4326, así que ST_SetSRID solo fija el tipo y no mueve datos.
ALTER TABLE "activities"
  ALTER COLUMN "path" TYPE geometry(LineString, 4326) USING ST_SetSRID("path", 4326);

ALTER TABLE "activity_points"
  ALTER COLUMN "location" TYPE geometry(Point, 4326) USING ST_SetSRID("location", 4326);

ALTER TABLE "routes"
  ALTER COLUMN "path" TYPE geometry(LineString, 4326) USING ST_SetSRID("path", 4326),
  ALTER COLUMN "startPoint" TYPE geometry(Point, 4326) USING ST_SetSRID("startPoint", 4326);

-- Índice espacial del recorrido para las rutas cercanas (spec 006)
-- CreateIndex
CREATE INDEX "activities_path_gist_idx" ON "activities" USING GIST ("path");

-- Una secuencia por actividad (RN-5): reemplaza el índice no único de 0_init
-- DropIndex
DROP INDEX "activity_points_activityId_sequence_idx_0b074f75";

-- CreateIndex
CREATE UNIQUE INDEX "activity_points_activityId_sequence_key" ON "activity_points"("activityId", "sequence");
