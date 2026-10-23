-- Spec 008 — T1. Contactos de emergencia, sesiones de seguridad y alertas.
-- Al crear esta migración (2026-10-22), una consulta de solo lectura confirmó que emergency_alerts
-- estaba vacía y que ningún usuario tenía users.emergencyContact*: se rehace emergency_alerts y se
-- quitan esas columnas sin perder datos (plan, Art. 5).

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNREACHABLE');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('WELCOME', 'TEST', 'ALERT', 'LOCATION', 'CANCELLED', 'FINISHED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'FAILED');

-- AlterEnum
ALTER TYPE "AlertReason" ADD VALUE 'RETURN_TIME_EXCEEDED';

-- AlterEnum
BEGIN;
CREATE TYPE "AlertStatus_new" AS ENUM ('ACTIVE', 'CANCELLED', 'RESOLVED');
ALTER TABLE "public"."emergency_alerts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "emergency_alerts" ALTER COLUMN "status" TYPE "AlertStatus_new" USING ("status"::text::"AlertStatus_new");
ALTER TYPE "AlertStatus" RENAME TO "AlertStatus_old";
ALTER TYPE "AlertStatus_new" RENAME TO "AlertStatus";
DROP TYPE "public"."AlertStatus_old";
ALTER TABLE "emergency_alerts" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "emergency_alerts" DROP CONSTRAINT "emergency_alerts_activityId_fkey";

-- DropIndex
DROP INDEX "emergency_alerts_activityId_idx_bf2a659e";

-- AlterTable
ALTER TABLE "emergency_alerts" DROP COLUMN "activityId",
DROP COLUMN "contactName",
DROP COLUMN "contactPhone",
DROP COLUMN "notifiedAt",
ADD COLUMN     "clientGeneratedId" UUID,
ADD COLUMN     "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lastForwardedAt" TIMESTAMPTZ(6),
ADD COLUMN     "lastForwardedLocation" geography(Point, 4326),
ADD COLUMN     "location" geography(Point, 4326),
ADD COLUMN     "locationAt" TIMESTAMPTZ(6),
ADD COLUMN     "sessionId" UUID NOT NULL,
ALTER COLUMN "triggeredAt" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emergencyContactName",
DROP COLUMN "emergencyContactPhone";

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "inviteToken" TEXT,
    "telegramChatId" BIGINT,
    "telegramName" TEXT,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_sessions" (
    "id" UUID NOT NULL,
    "clientGeneratedId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "ActivityType" NOT NULL,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "returnBy" TIMESTAMPTZ(6),
    "endedAt" TIMESTAMPTZ(6),
    "lastLocation" geography(Point, 4326),
    "lastLocationAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "safety_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_messages" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "alertId" UUID,
    "contactId" UUID,
    "contactName" TEXT NOT NULL,
    "kind" "MessageKind" NOT NULL,
    "status" "MessageStatus" NOT NULL,
    "telegramMessageId" BIGINT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_inviteToken_key" ON "emergency_contacts"("inviteToken");

-- CreateIndex
CREATE INDEX "emergency_contacts_userId_idx" ON "emergency_contacts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_userId_telegramChatId_key" ON "emergency_contacts"("userId", "telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "safety_sessions_clientGeneratedId_key" ON "safety_sessions"("clientGeneratedId");

-- CreateIndex
CREATE INDEX "safety_sessions_userId_idx" ON "safety_sessions"("userId");

-- CreateIndex
CREATE INDEX "safety_sessions_endedAt_returnBy_idx" ON "safety_sessions"("endedAt", "returnBy");

-- CreateIndex
CREATE INDEX "alert_messages_userId_idx" ON "alert_messages"("userId");

-- CreateIndex
CREATE INDEX "alert_messages_alertId_idx" ON "alert_messages"("alertId");

-- CreateIndex
CREATE INDEX "alert_messages_contactId_createdAt_idx" ON "alert_messages"("contactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_alerts_clientGeneratedId_key" ON "emergency_alerts"("clientGeneratedId");

-- CreateIndex
CREATE INDEX "emergency_alerts_sessionId_idx" ON "emergency_alerts"("sessionId");

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "safety_sessions" ADD CONSTRAINT "safety_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "safety_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alert_messages" ADD CONSTRAINT "alert_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alert_messages" ADD CONSTRAINT "alert_messages_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "emergency_alerts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alert_messages" ADD CONSTRAINT "alert_messages_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "emergency_contacts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;


-- CreateIndex: una sola alerta ACTIVE por sesión (spec 008, CA-27, RN-8, plan D3).
-- Prisma no declara índices parciales; se escribe a mano.
CREATE UNIQUE INDEX "emergency_alerts_sessionId_active_key" ON "emergency_alerts" ("sessionId") WHERE "status" = 'ACTIVE';
