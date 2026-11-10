import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const trustedOrigins = new Set(
  [
    env.FRONTEND_URL,
    ...env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  ].filter((origin) => origin && origin !== "*"),
);

export const protectUserRoutesFromCsrf = (req, _res, next) => {
  if (!unsafeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");

  if (!origin || !trustedOrigins.has(origin)) {
    next(new AppError("Request origin is not allowed", 403));
    return;
  }

  next();
};