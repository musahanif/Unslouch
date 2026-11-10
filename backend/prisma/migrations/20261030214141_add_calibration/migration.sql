/*
  Warnings:

  - A unique constraint covering the columns `[command_id]` on the table `Calibration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Calibration_Command_Status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Calibration" ADD COLUMN     "algorithm_version" TEXT,
ADD COLUMN     "captured_at" TIMESTAMP(3),
ADD COLUMN     "command_id" TEXT,
ADD COLUMN     "pitch_std_dev" DOUBLE PRECISION,
ADD COLUMN     "roll_std_dev" DOUBLE PRECISION,
ADD COLUMN     "sample_count" INTEGER,
ADD COLUMN     "sampling_rate_hz" INTEGER;

-- CreateTable
CREATE TABLE "CalibrationCommand" (
    "command_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "Calibration_Command_Status" NOT NULL DEFAULT 'PENDING',
    "required_pose" TEXT NOT NULL DEFAULT 'NEUTRAL_UPRIGHT_STANDING',
    "sample_count" INTEGER NOT NULL DEFAULT 300,
    "sampling_rate_hz" INTEGER NOT NULL DEFAULT 50,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_delivered_at" TIMESTAMP(3),
    "delivery_count" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "CalibrationCommand_pkey" PRIMARY KEY ("command_id")
);

-- CreateIndex
CREATE INDEX "CalibrationCommand_device_id_status_expires_at_idx" ON "CalibrationCommand"("device_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "CalibrationCommand_user_id_idx" ON "CalibrationCommand"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Calibration_command_id_key" ON "Calibration"("command_id");

-- CreateIndex
CREATE INDEX "Calibration_device_id_is_active_idx" ON "Calibration"("device_id", "is_active");

-- CreateIndex
CREATE INDEX "Device_user_id_idx" ON "Device"("user_id");

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "CalibrationCommand"("command_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationCommand" ADD CONSTRAINT "CalibrationCommand_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("device_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalibrationCommand" ADD CONSTRAINT "CalibrationCommand_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Calibration_one_active_per_device"
ON "Calibration" ("device_id")
WHERE "is_active" = true;