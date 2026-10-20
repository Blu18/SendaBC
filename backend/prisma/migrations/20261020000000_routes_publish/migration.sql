-- Spec 007 — T1. Publicar rutas, detalle y favoritas.
-- Al crear esta migración (2026-10-20), routes solo tenía las rutas de ejemplo; se regeneran con
-- `npm run seed:rutas` para llenar su perfil (spec 007, T10).

-- AlterEnum: borrado lógico de rutas (spec 007, CA-25, plan D5).
ALTER TYPE "RouteStatus" ADD VALUE 'DELETED';

-- AlterTable: perfil de elevación [[distancia m, altitud m], ...], ≤ 200 puntos (spec 007, RN-8, plan D2).
ALTER TABLE "routes" ADD COLUMN "elevationProfile" JSONB;
