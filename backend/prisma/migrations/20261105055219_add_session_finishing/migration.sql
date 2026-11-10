-- AlterEnum
ALTER TYPE "Session_Status" ADD VALUE IF NOT EXISTS 'FINISHING';

DROP INDEX IF EXISTS "Session_one_active_per_device";

CREATE UNIQUE INDEX "Session_one_open_per_device"
ON "Session" ("device_id")
WHERE "status" IN ('ACTIVE', 'FINISHING');
