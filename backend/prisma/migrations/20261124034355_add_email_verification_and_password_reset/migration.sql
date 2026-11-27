-- AlterTable
ALTER TABLE "User" ADD COLUMN     "auth_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "email_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerificationOtp" (
    "email_verification_otp_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_sent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailVerificationOtp_pkey" PRIMARY KEY ("email_verification_otp_id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "password_reset_token_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("password_reset_token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationOtp_user_id_key" ON "EmailVerificationOtp"("user_id");

-- CreateIndex
CREATE INDEX "EmailVerificationOtp_expires_at_idx" ON "EmailVerificationOtp"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_user_id_key" ON "PasswordResetToken"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expires_at_idx" ON "PasswordResetToken"("expires_at");

-- AddForeignKey
ALTER TABLE "EmailVerificationOtp" ADD CONSTRAINT "EmailVerificationOtp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
