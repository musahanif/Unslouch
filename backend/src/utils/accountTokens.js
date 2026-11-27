import { createHmac, randomBytes, randomInt } from "node:crypto";
import { env } from "../config/env.js";

const hash = (purpose, value) =>
  createHmac("sha256", env.ACCOUNT_TOKEN_PEPPER)
    .update(`${purpose}:${value}`)
    .digest("hex");

export const generateEmailVerificationOtp = () =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

export const hashEmailVerificationOtp = (otp) =>
  hash("email-verification-otp", otp);

export const generatePasswordResetToken = () =>
  randomBytes(32).toString("base64url");

export const hashPasswordResetToken = (token) =>
  hash("password-reset-token", token);