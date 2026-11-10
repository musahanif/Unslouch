/*
  Warnings:

  - The values [IN_PROGRESS] on the enum `Session_Status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
ALTER TYPE "Session_Status" RENAME TO "Session_Status_old";

CREATE TYPE "Session_Status" AS ENUM (
  'ACTIVE',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'INCOMPLETE',
  'ABORTED'
);

ALTER TABLE "Session"
ALTER COLUMN "status" TYPE "Session_Status"
USING (
  CASE
    WHEN "status"::text = 'IN_PROGRESS' THEN 'ACTIVE'
    ELSE "status"::text
  END
)::"Session_Status";

ALTER TABLE "Session"
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "Session_Status_old";
COMMIT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "calibration_id" TEXT;

-- CreateIndex
CREATE INDEX "Session_user_id_start_time_idx" ON "Session"("user_id", "start_time");

-- CreateIndex
CREATE INDEX "Session_device_id_status_idx" ON "Session"("device_id", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_calibration_id_fkey" FOREIGN KEY ("calibration_id") REFERENCES "Calibration"("calibration_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "Session_one_active_per_device"
ON "Session" ("device_id")
WHERE "status" = 'ACTIVE';