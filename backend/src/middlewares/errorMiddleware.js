import { env } from "../config/env.js";
import { sendError } from "../utils/apiResponse.js";

export const errorMiddleware = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let errors = error.errors;

  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Request body contains invalid JSON";
  }

  if (error.code === "P2002") {
    statusCode = 409;
    message = "A record with the same unique value already exists";
  }

  if (error.code === "P2025") {
    statusCode = 404;
    message = "Requested record was not found";
  }

  if (statusCode >= 500) {
    console.error(error);
    message = "Internal server error";
    errors = env.NODE_ENV === "development" ? { detail: error.message } : undefined;
  }

  return sendError(res, { statusCode, message, errors });
};
