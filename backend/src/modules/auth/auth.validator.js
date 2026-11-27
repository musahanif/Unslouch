import { z } from "zod";
import { AppError } from "../../utils/AppError.js";

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = {};

    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      errors[key] ??= issue.message;
    }

    next(new AppError("Request validation failed", 400, errors));
    return;
  }

  req.validatedBody = result.data;
  next();
};

const email = z
  .string({ error: "Email is required" })
  .trim()
  .email("Email must be valid")
  .max(254)
  .transform((value) => value.toLowerCase());

const password = z
  .string({ error: "Password is required" })
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password must contain at most 72 characters");

const otp = z
  .string({ error: "Verification code is required" })
  .trim()
  .regex(/^\d{6}$/, "Verification code must contain exactly 6 digits");

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
  })
  .strict();

const loginSchema = z.object({ email, password }).strict();

const verifyEmailSchema = z.object({ email, otp }).strict();

const resendVerificationSchema = z.object({ email }).strict();

const requestPasswordResetSchema = z.object({ email }).strict();

const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(32)
      .max(256)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Password reset link is invalid",
      ),
    password,
  })
  .strict();

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateVerifyEmail = validate(verifyEmailSchema);
export const validateResendVerification = validate(resendVerificationSchema);
export const validateRequestPasswordReset = validate(
  requestPasswordResetSchema,
);
export const validateResetPassword = validate(resetPasswordSchema);