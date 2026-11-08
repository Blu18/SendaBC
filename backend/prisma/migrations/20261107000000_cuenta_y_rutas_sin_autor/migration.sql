-- Spec 011 — T10. Avatar como id de ícono y rutas que sobreviven al borrar la cuenta del autor.
-- Al crear esta migración (2026-11-07), una consulta de solo lectura confirmó que ningún usuario tenía
-- users.avatarUrl: se renombra la columna sin perder datos (plan, D4).

-- users.avatarUrl -> users.avatarId (CA-42)
ALTER TABLE "users" RENAME COLUMN "avatarUrl" TO "avatarId";

-- routes.createdByUserId: opcional, y SET NULL al borrar al autor (CA-48, RN-16)
ALTER TABLE "routes" DROP CONSTRAINT "routes_createdByUserId_fkey";
ALTER TABLE "routes" ALTER COLUMN "createdByUserId" DROP NOT NULL;
ALTER TABLE "routes" ADD CONSTRAINT "routes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- routes.sourceActivityId: SET NULL, para que la cascada de actividades no choque con las rutas conservadas (CA-48)
ALTER TABLE "routes" DROP CONSTRAINT "routes_sourceActivityId_fkey";
ALTER TABLE "routes" ADD CONSTRAINT "routes_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
