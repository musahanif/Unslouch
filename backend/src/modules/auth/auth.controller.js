import { env } from "../../config/env.js";
import { authService } from "./auth.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";

const authCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const sendAuthenticatedResponse = (
  res,
  { statusCode = 200, message, data },
) => {
  res.cookie("unslouch_token", data.token, authCookieOptions);

  return sendSuccess(res, {
    statusCode,
    message,
    data: {
      user: data.user,
    },
  });
};

export const register = async (req, res) => {
  const data = await authService.register(req.validatedBody);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Registration successful. Verify your email to continue.",
    data: {
      user: data.user,
      verificationRequired: true,
    },
  });
};

export const verifyEmail = async (req, res) => {
  const data = await authService.verifyEmail(req.validatedBody);

  return sendAuthenticatedResponse(res, {
    message: "Email verified successfully",
    data,
  });
};

export const resendEmailVerification = async (req, res) => {
  await authService.resendEmailVerification(req.validatedBody.email);

  return sendSuccess(res, {
    message:
      "If an unverified account exists for that email address, a verification code has been sent.",
  });
};

export const login = async (req, res) => {
  const data = await authService.login(req.validatedBody);

  return sendAuthenticatedResponse(res, {
    message: "Login successful",
    data,
  });
};

export const requestPasswordReset = async (req, res) => {
  await authService.requestPasswordReset(req.validatedBody.email);

  return sendSuccess(res, {
    message:
      "If a verified account exists for that email address, a password reset link has been sent.",
  });
};

export const resetPassword = async (req, res) => {
  await authService.resetPassword(req.validatedBody);

  res.clearCookie("unslouch_token", authCookieOptions);

  return sendSuccess(res, {
    message: "Password reset successfully. Please sign in again.",
  });
};

export const logout = async (_req, res) => {
  res.clearCookie("unslouch_token", authCookieOptions);

  return sendSuccess(res, {
    message: "Logout successful.",
  });
};

export const getCurrentUser = async (req, res) =>
  sendSuccess(res, {
    message: "Current user retrieved",
    data: { user: authService.getProfile(req.user) },
  });