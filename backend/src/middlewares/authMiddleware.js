import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { authRepository } from "../modules/auth/auth.repository.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const readToken = (req) => {
  const token = req.cookies?.unslouch_token;

  if (!token) {
    throw new AppError("Authentication cookie is required", 401);
  }

  return token;
};

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);

  let payload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("Authentication token has expired", 401);
    }

    throw new AppError("Authentication token is invalid", 401);
  }

  if (
    typeof payload !== "object" ||
    !payload.sub ||
    !payload.email
  ) {
    throw new AppError("Authentication token payload is invalid", 401);
  }

  const account = await authRepository.findUserByEmail(payload.email);

  if (!account || account.user_id !== payload.sub) {
    throw new AppError("Authenticated account is unavailable", 401);
  }

  req.user = account;
  next();
});