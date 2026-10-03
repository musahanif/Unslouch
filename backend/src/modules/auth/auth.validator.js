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

const registerSchema = z
  .object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100),
    email,
    password,
  })
  .strict();

const loginSchema = z.object({ email, password }).strict();

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);

