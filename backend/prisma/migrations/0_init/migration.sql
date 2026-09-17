-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- CreateTable
CREATE TABLE "users" (
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "id" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "clientGeneratedId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distanceMeters" DOUBLE PRECISION,
    "durationSeconds" INTEGER,
    "elevationGainMeters" DOUBLE PRECISION,
    "elevationLossMeters" DOUBLE PRECISION,
    "endedAt" TIMESTAMPTZ(6),
    "id" UUID NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "path" geometry,
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECORDING',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_points" (
    "accuracyMeters" DOUBLE PRECISION,
    "activityId" UUID NOT NULL,
    "altitudeMeters" DOUBLE PRECISION,
    "id" BIGSERIAL NOT NULL,
    "location" geometry NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "activity_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" UUID NOT NULL,
    "description" TEXT,
    "difficulty" TEXT,
    "distanceMeters" DOUBLE PRECISION,
    "elevationGainMeters" DOUBLE PRECISION,
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "path" geometry,
    "region" TEXT,
    "sourceActivityId" UUID,
    "startPoint" geometry,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_favorites" (
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "routeId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "route_favorites_pkey" PRIMARY KEY ("userId","routeId")
);

-- CreateTable
CREATE TABLE "emergency_alerts" (
    "activityId" UUID NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "id" UUID NOT NULL,
    "notifiedAt" TIMESTAMPTZ(6),
    "reason" TEXT NOT NULL,
    "resolvedAt" TIMESTAMPTZ(6),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expoPushToken" TEXT NOT NULL,
    "id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "activities_clientGeneratedId_key" ON "activities"("clientGeneratedId");

-- CreateIndex
CREATE INDEX "activities_userId_idx_a489d58a" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activity_points_activityId_idx_bf2a659e" ON "activity_points"("activityId");

-- CreateIndex
CREATE INDEX "activity_points_activityId_sequence_idx_0b074f75" ON "activity_points"("activityId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "routes_sourceActivityId_key" ON "routes"("sourceActivityId");

-- CreateIndex
CREATE INDEX "routes_createdByUserId_idx_93e8a540" ON "routes"("createdByUserId");

-- CreateIndex
CREATE INDEX "routes_status_idx_e98638ab" ON "routes"("status");

-- CreateIndex
CREATE INDEX "route_favorites_routeId_idx_91ae2fd6" ON "route_favorites"("routeId");

-- CreateIndex
CREATE INDEX "route_favorites_userId_idx_a489d58a" ON "route_favorites"("userId");

-- CreateIndex
CREATE INDEX "emergency_alerts_activityId_idx_bf2a659e" ON "emergency_alerts"("activityId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_expoPushToken_key" ON "devices"("expoPushToken");

-- CreateIndex
CREATE INDEX "devices_userId_idx_a489d58a" ON "devices"("userId");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_points" ADD CONSTRAINT "activity_points_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "activities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "route_favorites" ADD CONSTRAINT "route_favorites_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "route_favorites" ADD CONSTRAINT "route_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
