-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "pending_credential_created_at" TIMESTAMP(3),
ADD COLUMN     "pending_credential_expires_at" TIMESTAMP(3),
ADD COLUMN     "pending_credential_hash" TEXT;
