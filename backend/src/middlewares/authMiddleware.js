import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { authRepository } from "../modules/auth/auth.repository.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const readBearerToken = (authorization) => {
  if (!authorization) {
    throw new AppError("Authentication token is required", 401);
  }

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    throw new AppError(
      "Authorization header must use Bearer token format",
      401,
    );
  }

  return parts[1];
};

const readToken = (req) => {
  if (req.cookies?.teksid_token) {
    return req.cookies.teksid_token;
  }

  return readBearerToken(req.headers.authorization);
};

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);

  let payload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
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

  const account = await authRepository.findUserByEmail(
    payload.email,
  );

  if (!account) {
    throw new AppError("Authenticated account is unavailable", 401);
  }

  req.user = { ...account };
  next();
});
