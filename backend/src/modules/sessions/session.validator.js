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

const createSessionSchema = z
  .object({
    deviceId: z.string().cuid("Device ID is invalid"),
  })
  .strict();

const sessionIdParamSchema = z
  .object({
    sessionId: z.string().cuid("Session ID is invalid"),
  })
  .strict();

const listSessionQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export const validateCreateSession = validate(
  createSessionSchema,
  "body",
  "validatedBody",
);

export const validateSessionIdParam = validate(
  sessionIdParamSchema,
  "params",
  "validatedParams",
);

export const validateListSessions = validate(
  listSessionQuerySchema,
  "query",
  "validatedQuery",
);
