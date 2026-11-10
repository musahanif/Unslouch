import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const hash = (purpose, value) =>
  createHmac("sha256", env.DEVICE_CREDENTIAL_PEPPER)
    .update(`${purpose}:${value}`)
    .digest("hex");

export const hashDeviceSecret = (secret) => hash("device-secret", secret);

export const hashSetupCode = (setupCode) =>
  hash("device-setup-code", setupCode);

export const generateDeviceSecret = () => randomBytes(32).toString("base64url");

export const generateSetupCode = () => randomBytes(9).toString("base64url");

export const safelyMatchesHash = (expectedHash, actualHash) => {
  if (typeof expectedHash !== "string" || typeof actualHash !== "string") {
    return false;
  }

  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
