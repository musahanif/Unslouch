import { z } from "zod";
import { AppError } from "../../utils/AppError.js";

const validate = (schema, source, target) => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = {};

    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || source;
      errors[key] ??= issue.message;
    }

    next(new AppError("Request validation failed", 400, errors));
    return;
  }

  req[target] = result.data;
  next();
};

const deviceIdParamsSchema = z
  .object({
    deviceId: z.string().cuid("Device ID is invalid"),
  })
  .strict();

const pairDeviceSchema = z
  .object({
    serialNumber: z
      .string()
      .trim()
      .min(4)
      .max(100)
      .transform((value) => value.toUpperCase()),
    setupCode: z.string().trim().min(12).max(128),
  })
  .strict();

const heartbeatSchema = z
  .object({
    batteryLevel: z.number().int().min(0).max(100).optional(),
    firmwareVersion: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.batteryLevel !== undefined || value.firmwareVersion !== undefined,
    {
      message: "At least one heartbeat field is required",
    },
  );

const activatePendingCredentialSchema = z
  .object({
    secret: z
      .string()
      .trim()
      .min(32)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/, "Credential secret format is invalid"),
  })
  .strict();

export const validatePairDevice = validate(
  pairDeviceSchema,
  "body",
  "validatedBody",
);

export const validateHeartbeat = validate(
  heartbeatSchema,
  "body",
  "validatedBody",
);

export const validateDeviceIdParam = validate(
  deviceIdParamsSchema,
  "params",
  "validatedParams",
);

export const validateActivatePendingCredential = validate(
  activatePendingCredentialSchema,
  "body",
  "validatedBody",
);
