/*
  Warnings:

  - The `status` column on the `activities` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `emergency_alerts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `difficulty` column on the `routes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `routes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `activities` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `platform` on the `devices` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `reason` on the `emergency_alerts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `routes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('HIKING', 'TRAIL_RUNNING', 'CYCLING');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('RECORDING', 'PENDING_SYNC', 'SYNCED');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RouteDifficulty" AS ENUM ('EASY', 'MODERATE', 'HARD', 'EXTREME');

-- CreateEnum
CREATE TYPE "AlertReason" AS ENUM ('INACTIVITY_TIMEOUT', 'MANUAL_SOS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'NOTIFIED', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "status",
ADD COLUMN     "status" "ActivityStatus" NOT NULL DEFAULT 'RECORDING',
DROP COLUMN "type",
ADD COLUMN     "type" "ActivityType" NOT NULL;

-- AlterTable
ALTER TABLE "devices" DROP COLUMN "platform",
ADD COLUMN     "platform" "DevicePlatform" NOT NULL;

-- AlterTable
ALTER TABLE "emergency_alerts" DROP COLUMN "reason",
ADD COLUMN     "reason" "AlertReason" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AlertStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "routes" DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "RouteDifficulty",
DROP COLUMN "status",
ADD COLUMN     "status" "RouteStatus" NOT NULL DEFAULT 'DRAFT',
DROP COLUMN "type",
ADD COLUMN     "type" "ActivityType" NOT NULL;

-- CreateIndex
CREATE INDEX "routes_status_idx_e98638ab" ON "routes"("status");
