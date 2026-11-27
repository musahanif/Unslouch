import { prisma } from "../../config/db.js";

const accountSelect = {
  user_id: true,
  name: true,
  email: true,
  email_verified_at: true,
  auth_version: true,
  scoliosis_type: true,
  target_daily_exercise_min: true,
  posture_alert_threshold_sec: true,
  created_at: true,
  updated_at: true,
};

const accountWithPasswordSelect = {
  ...accountSelect,
  password: true,
};

export const authRepository = {
  findUserByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: accountWithPasswordSelect,
    });
  },

  findUserForAuth(email) {
    return prisma.user.findUnique({
      where: { email },
      select: accountWithPasswordSelect,
    });
  },

  createUser(data) {
    return prisma.user.create({
      data,
      select: accountWithPasswordSelect,
    });
  },

  findEmailVerificationOtp(userId) {
    return prisma.emailVerificationOtp.findUnique({
      where: { user_id: userId },
      select: {
        email_verification_otp_id: true,
        code_hash: true,
        attempts: true,
        expires_at: true,
        last_sent_at: true,
      },
    });
  },

  upsertEmailVerificationOtp({ userId, codeHash, expiresAt }) {
    const now = new Date();

    return prisma.emailVerificationOtp.upsert({
      where: { user_id: userId },
      update: {
        code_hash: codeHash,
        attempts: 0,
        expires_at: expiresAt,
        last_sent_at: now,
      },
      create: {
        user_id: userId,
        code_hash: codeHash,
        attempts: 0,
        expires_at: expiresAt,
        last_sent_at: now,
      },
    });
  },

  async verifyEmailWithOtp({ userId, codeHash }) {
    return prisma.$transaction(async (tx) => {
      const otp = await tx.emailVerificationOtp.findUnique({
        where: { user_id: userId },
        select: {
          email_verification_otp_id: true,
          code_hash: true,
          attempts: true,
          expires_at: true,
        },
      });

      const now = new Date();

      if (!otp || otp.expires_at <= now || otp.attempts >= 5) {
        return null;
      }

      if (otp.code_hash !== codeHash) {
        await tx.emailVerificationOtp.update({
          where: {
            email_verification_otp_id: otp.email_verification_otp_id,
          },
          data: {
            attempts: {
              increment: 1,
            },
          },
        });

        return null;
      }

      const consumed = await tx.emailVerificationOtp.deleteMany({
        where: {
          email_verification_otp_id: otp.email_verification_otp_id,
          code_hash: codeHash,
          expires_at: { gt: now },
          attempts: { lt: 5 },
        },
      });

      if (consumed.count !== 1) {
        return null;
      }

      return tx.user.update({
        where: { user_id: userId },
        data: {
          email_verified_at: now,
        },
        select: accountWithPasswordSelect,
      });
    });
  },

  upsertPasswordResetToken({ userId, tokenHash, expiresAt }) {
    return prisma.passwordResetToken.upsert({
      where: { user_id: userId },
      update: {
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
      create: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });
  },

  async resetPasswordWithToken({ tokenHash, passwordHash }) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();

      const token = await tx.passwordResetToken.findFirst({
        where: {
          token_hash: tokenHash,
          expires_at: { gt: now },
        },
        select: {
          password_reset_token_id: true,
          user_id: true,
        },
      });

      if (!token) {
        return false;
      }

      const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          password_reset_token_id: token.password_reset_token_id,
          token_hash: tokenHash,
          expires_at: { gt: now },
        },
      });

      if (consumed.count !== 1) {
        return false;
      }

      await tx.user.update({
        where: { user_id: token.user_id },
        data: {
          password: passwordHash,
          auth_version: {
            increment: 1,
          },
        },
      });

      return true;
    });
  },
};
