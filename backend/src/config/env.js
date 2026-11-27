import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(5001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  DEVICE_CREDENTIAL_PEPPER: z
    .string()
    .min(32, "DEVICE_CREDENTIAL_PEPPER must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  FRONTEND_URL: z
    .url({
      protocol: /^https?$/,
      error: "FRONTEND_URL must be an absolute HTTP/HTTPS URL",
    })
    .default("http://localhost:3000"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  ACCOUNT_TOKEN_PEPPER: z
    .string()
    .min(32, "ACCOUNT_TOKEN_PEPPER must be at least 32 characters"),

  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  SMTP_FROM: z.string().email("SMTP_FROM must be a valid email address"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = Object.freeze(parsed.data);
