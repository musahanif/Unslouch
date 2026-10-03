import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

export const hashPassword = (password) =>
  bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
