import { authRepository } from "./auth.repository.js";
import { comparePassword } from "../../utils/comparePassword.js";
import { generateToken } from "../../utils/generateToken.js";
import { hashPassword } from "../../utils/hashPassword.js";
import {
  generateEmailVerificationOtp,
  generatePasswordResetToken,
  hashEmailVerificationOtp,
  hashPasswordResetToken,
} from "../../utils/accountTokens.js";
import {
  sendEmailVerificationOtp,
  sendPasswordResetLink,
} from "../../utils/mailService.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/AppError.js";

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_LINK_LIFETIME_MS = 30 * 60 * 1000;

const toSafeAccount = (account) => ({
  user_id: account.user_id,
  name: account.name,
  email: account.email,
  email_verified_at: account.email_verified_at,
  scoliosis_type: account.scoliosis_type,
  target_daily_exercise_min: account.target_daily_exercise_min,
  posture_alert_threshold_sec: account.posture_alert_threshold_sec,
  created_at: account.created_at,
  updated_at: account.updated_at,
});

const sendVerificationOtp = async (account) => {
  const existing = await authRepository.findEmailVerificationOtp(
    account.user_id,
  );

  if (
    existing &&
    Date.now() - existing.last_sent_at.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return;
  }

  const otp = generateEmailVerificationOtp();

  await authRepository.upsertEmailVerificationOtp({
    userId: account.user_id,
    codeHash: hashEmailVerificationOtp(otp),
    expiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
  });

  await sendEmailVerificationOtp({
    email: account.email,
    otp,
  });
};

const authenticateCredentials = async ({ email, password }) => {
  const account = await authRepository.findUserForAuth(email);

  if (!account) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await comparePassword(password, account.password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!account.email_verified_at) {
    throw new AppError(
      "Please verify your email address before signing in",
      403,
    );
  }

  return {
    token: generateToken(account),
    user: toSafeAccount(account),
  };
};

export const authService = {
  async register({ name, email, password }) {
    const existingUser = await authRepository.findUserByEmail(email);

    if (existingUser) {
      throw new AppError("Email is already registered", 409, {
        email: "Use a different email address",
      });
    }

    const user = await authRepository.createUser({
      name,
      email,
      password: await hashPassword(password),
    });

    try {
      await sendVerificationOtp(user);
    } catch (error) {
      console.error("Verification email could not be sent:", error);
      throw new AppError(
        "Account was created, but the verification email could not be sent. Please try resending the verification code.",
        503,
      );
    }

    return {
      user: toSafeAccount(user),
    };
  },

  login(credentials) {
    return authenticateCredentials(credentials);
  },

  async verifyEmail({ email, otp }) {
    const account = await authRepository.findUserByEmail(email);

    if (!account) {
      throw new AppError("Verification code is invalid or expired", 400);
    }

    if (account.email_verified_at) {
      throw new AppError("Email address is already verified", 409);
    }

    const verifiedAccount = await authRepository.verifyEmailWithOtp({
      userId: account.user_id,
      codeHash: hashEmailVerificationOtp(otp),
    });

    if (!verifiedAccount) {
      throw new AppError("Verification code is invalid or expired", 400);
    }

    return {
      token: generateToken(verifiedAccount),
      user: toSafeAccount(verifiedAccount),
    };
  },

  async resendEmailVerification(email) {
    const account = await authRepository.findUserByEmail(email);

    if (!account || account.email_verified_at) {
      return;
    }

    try {
      await sendVerificationOtp(account);
    } catch (error) {
      console.error("Verification email could not be resent:", error);
    }
  },

  async requestPasswordReset(email) {
    const account = await authRepository.findUserByEmail(email);

    // Do not reveal whether an account exists.
    if (!account || !account.email_verified_at) {
      return;
    }

    const token = generatePasswordResetToken();

    await authRepository.upsertPasswordResetToken({
      userId: account.user_id,
      tokenHash: hashPasswordResetToken(token),
      expiresAt: new Date(Date.now() + RESET_LINK_LIFETIME_MS),
    });

    // Token is in the fragment so it is not sent to the frontend server.
    const resetUrl = `${env.FRONTEND_URL}/reset-password#token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetLink({
        email: account.email,
        resetUrl,
      });
    } catch (error) {
      console.error("Password reset email could not be sent:", error);
    }
  },

  async resetPassword({ token, password }) {
    const wasReset = await authRepository.resetPasswordWithToken({
      tokenHash: hashPasswordResetToken(token),
      passwordHash: await hashPassword(password),
    });

    if (!wasReset) {
      throw new AppError(
        "Password reset link is invalid, expired, or was already used",
        400,
      );
    }
  },

  getProfile(account) {
    return toSafeAccount(account);
  },
};
