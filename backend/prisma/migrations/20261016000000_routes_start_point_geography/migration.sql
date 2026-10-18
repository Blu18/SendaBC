-- Spec 006 — T1. Rutas cercanas.
-- La tabla routes estaba vacía al crear esta migración (2026-10-16); la publicación llega en la 007.

-- startPoint como geography para que ST_DWithin mida en metros y use el índice sin casts
-- (spec 006, plan D1). Prisma no genera este cambio porque la columna es Unsupported.
ALTER TABLE "routes"
  ALTER COLUMN "startPoint" TYPE geography(Point, 4326) USING "startPoint"::geography;

-- CreateIndex
CREATE INDEX "routes_startPoint_gist_idx" ON "routes" USING GIST ("startPoint");
