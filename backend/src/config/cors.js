import { env } from "./env.js";

const allowedOrigins = [
  env.FRONTEND_URL,
  ...env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
].filter(Boolean);

if (allowedOrigins.includes("*")) {
  throw new Error(
    "CORS_ORIGIN must list explicit origins when cookie authentication is enabled",
  );
}

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || uniqueAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    const error = new Error("Origin is not allowed by CORS");
    error.statusCode = 403;
    callback(error);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};