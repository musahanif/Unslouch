import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateToken = ({ user_id, email, auth_version }) =>
  jwt.sign(
    {
      email,
      authVersion: auth_version,
    },
    env.JWT_SECRET,
    {
      subject: user_id,
      expiresIn: env.JWT_EXPIRES_IN,
      algorithm: "HS256",
    },
  );