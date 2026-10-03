import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const generateToken = ({ user_id, email }) => {
  const token = jwt.sign({ email }, env.JWT_SECRET, {
    subject: user_id,
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: "HS256",
  });

  return token;
};
