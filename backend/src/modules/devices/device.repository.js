import { prisma } from "../../config/db.js";

const publicDeviceSelect = {
  device_id: true,
  serial_number: true,
  mac_address: true,
  device_model: true,
  firmware_version: true,
  is_active: true,
  paired_at: true,
  battery_level: true,
  last_seen_at: true,
  last_synced_at: true,
  created_at: true,
  updated_at: true,
};

export const deviceRepository = {
  createUnpaired(data) {
    return prisma.device.create({
      data,
      select: publicDeviceSelect,
    });
  },

  findForPairing(serialNumber) {
    return prisma.device.findUnique({
      where: { serial_number: serialNumber },
      select: {
        ...publicDeviceSelect,
        user_id: true,
        setup_code_hash: true,
      },
    });
  },

  async claimDevice({ deviceId, userId, credentialHash }) {
    const result = await prisma.device.updateMany({
      where: {
        device_id: deviceId,
        user_id: null,
        is_active: true,
      },
      data: {
        user_id: userId,
        credential_hash: credentialHash,
        credential_created_at: new Date(),
        setup_code_hash: null,
        paired_at: new Date(),
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return prisma.device.findUnique({
      where: { device_id: deviceId },
      select: publicDeviceSelect,
    });
  },

  findOwnedByUser(deviceId, userId) {
    return prisma.device.findFirst({
      where: {
        device_id: deviceId,
        user_id: userId,
      },
      select: publicDeviceSelect,
    });
  },

  listForUser(userId) {
    return prisma.device.findMany({
      where: { user_id: userId },
      select: publicDeviceSelect,
      orderBy: { created_at: "desc" },
    });
  },

  findForDeviceAuthentication(deviceId) {
    return prisma.device.findUnique({
      where: { device_id: deviceId },
      select: {
        ...publicDeviceSelect,
        credential_hash: true,
        credential_revoked_at: true,
      },
    });
  },

  async stageCredentialRotation(deviceId, credentialHash, expiresAt) {
    const result = await prisma.device.updateMany({
      where: {
        device_id: deviceId,
        OR: [
          { pending_credential_hash: null },
          { pending_credential_expires_at: { lte: new Date() } },
        ],
      },
      data: {
        pending_credential_hash: credentialHash,
        pending_credential_created_at: new Date(),
        pending_credential_expires_at: expiresAt,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return prisma.device.findUnique({
      where: { device_id: deviceId },
      select: publicDeviceSelect,
    });
  },

  async activatePendingCredential(deviceId, credentialHash) {
    const now = new Date();

    const result = await prisma.device.updateMany({
      where: {
        device_id: deviceId,
        is_active: true,
        pending_credential_hash: credentialHash,
        pending_credential_expires_at: { gt: now },
      },
      data: {
        credential_hash: credentialHash,
        credential_created_at: now,
        credential_rotated_at: now,
        credential_revoked_at: null,
        pending_credential_hash: null,
        pending_credential_created_at: null,
        pending_credential_expires_at: null,
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return prisma.device.findUnique({
      where: { device_id: deviceId },
      select: publicDeviceSelect,
    });
  },

  markSeen(deviceId) {
    return prisma.device.update({
      where: { device_id: deviceId },
      data: { last_seen_at: new Date() },
      select: publicDeviceSelect,
    });
  },

  updateHeartbeat(deviceId, data) {
    return prisma.device.update({
      where: { device_id: deviceId },
      data: {
        ...(data.batteryLevel !== undefined
          ? { battery_level: data.batteryLevel }
          : {}),
        ...(data.firmwareVersion !== undefined
          ? { firmware_version: data.firmwareVersion }
          : {}),
        last_seen_at: new Date(),
      },
      select: publicDeviceSelect,
    });
  },
};
