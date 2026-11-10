/*
  Warnings:

  - A unique constraint covering the columns `[serial_number]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[credential_hash]` on the table `Device` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `serial_number` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_user_id_fkey";

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "credential_created_at" TIMESTAMP(3),
ADD COLUMN     "credential_hash" TEXT,
ADD COLUMN     "credential_revoked_at" TIMESTAMP(3),
ADD COLUMN     "credential_rotated_at" TIMESTAMP(3),
ADD COLUMN     "firmware_version" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_seen_at" TIMESTAMP(3),
ADD COLUMN     "paired_at" TIMESTAMP(3),
ADD COLUMN     "serial_number" TEXT NOT NULL,
ADD COLUMN     "setup_code_hash" TEXT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Device_serial_number_key" ON "Device"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "Device_credential_hash_key" ON "Device"("credential_hash");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
