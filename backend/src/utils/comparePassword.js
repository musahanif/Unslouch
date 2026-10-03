import bcrypt from "bcryptjs";

export const comparePassword = (password, passwordHash) =>
  bcrypt.compare(password, passwordHash);
