import { AppError } from "../../utils/AppError.js";
import {
  generateDeviceSecret,
  hashDeviceSecret,
  hashSetupCode,
  safelyMatchesHash,
} from "../../utils/deviceCredentials.js";
import { deviceRepository } from "./device.repository.js";

const deviceAuthorization = (deviceId, secret) =>
  `Device ${deviceId}.${secret}`;

const PENDING_CREDENTIAL_LIFETIME_MS = 10 * 60 * 1000;

export const deviceService = {
  async pair(userId, { serialNumber, setupCode }) {
    const device = await deviceRepository.findForPairing(serialNumber);

    if (
      !device ||
      !device.is_active ||
      !device.setup_code_hash ||
      !safelyMatchesHash(device.setup_code_hash, hashSetupCode(setupCode))
    ) {
      throw new AppError("Invalid device pairing details", 401);
    }

    if (device.user_id) {
      throw new AppError("This device has already been paired", 409);
    }

    const secret = generateDeviceSecret();

    const claimedDevice = await deviceRepository.claimDevice({
      deviceId: device.device_id,
      userId,
      credentialHash: hashDeviceSecret(secret),
    });

    if (!claimedDevice) {
      throw new AppError(
        "This device was paired by another request. Refresh and try again.",
        409,
      );
    }

    // This is the only time the original device secret is returned.
    return {
      device: claimedDevice,
      credential: {
        deviceId: claimedDevice.device_id,
        secret,
        authorization: deviceAuthorization(claimedDevice.device_id, secret),
      },
    };
  },

  listForUser(userId) {
    return deviceRepository.listForUser(userId);
  },

  async getOwnedDevice(userId, deviceId) {
    const device = await deviceRepository.findOwnedByUser(deviceId, userId);

    if (!device) {
      throw new AppError("Device was not found", 404);
    }

    return device;
  },

  async rotateCredential(userId, deviceId) {
    await this.getOwnedDevice(userId, deviceId);

    const secret = generateDeviceSecret();
    const expiresAt = new Date(Date.now() + PENDING_CREDENTIAL_LIFETIME_MS);

    const device = await deviceRepository.stageCredentialRotation(
      deviceId,
      hashDeviceSecret(secret),
      expiresAt,
    );

    if (!device) {
      throw new AppError(
        "A credential rotation is already pending. Complete it or wait for it to expire.",
        409,
      );
    }

    return {
      device,
      credential: {
        deviceId: device.device_id,
        secret,
        authorization: deviceAuthorization(device.device_id, secret),
        expiresAt,
      },
    };
  },

  async activatePendingCredential(deviceId, secret) {
    const device = await deviceRepository.activatePendingCredential(
      deviceId,
      hashDeviceSecret(secret),
    );

    if (!device) {
      throw new AppError(
        "Pending credential is invalid, expired, or already activated",
        409,
      );
    }

    return device;
  },

  heartbeat(deviceId, data) {
    return deviceRepository.updateHeartbeat(deviceId, data);
  },
};
