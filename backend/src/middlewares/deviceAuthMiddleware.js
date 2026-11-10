import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  hashDeviceSecret,
  safelyMatchesHash,
} from "../utils/deviceCredentials.js";
import { deviceRepository } from "../modules/devices/device.repository.js";

const readDeviceCredential = (authorization) => {
  if (!authorization) {
    throw new AppError("Device credential is required", 401);
  }

  const [scheme, credential] = authorization.trim().split(/\s+/);

  if (scheme !== "Device" || !credential) {
    throw new AppError(
      "Authorization header must use Device credential format",
      401,
    );
  }

  const [deviceId, secret, extra] = credential.split(".");

  if (!deviceId || !secret || extra) {
    throw new AppError("Device credential is invalid", 401);
  }

  return { deviceId, secret };
};

export const authenticateDevice = asyncHandler(async (req, _res, next) => {
  const { deviceId, secret } = readDeviceCredential(
    req.headers.authorization,
  );

  const device = await deviceRepository.findForDeviceAuthentication(deviceId);

  if (
    !device ||
    !device.is_active ||
    device.credential_revoked_at ||
    !device.credential_hash ||
    !safelyMatchesHash(
      device.credential_hash,
      hashDeviceSecret(secret),
    )
  ) {
    throw new AppError("Device credential is invalid or revoked", 401);
  }

  req.device = await deviceRepository.markSeen(device.device_id);
  next();
});