import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

const calibrationSelect = {
  calibration_id: true,
  device_id: true,
  baseline_pitch: true,
  baseline_roll: true,
  sample_count: true,
  sampling_rate_hz: true,
  pitch_std_dev: true,
  roll_std_dev: true,
  algorithm_version: true,
  captured_at: true,
  is_active: true,
  calibrated_at: true,
};

const commandSelect = {
  command_id: true,
  device_id: true,
  status: true,
  required_pose: true,
  sample_count: true,
  sampling_rate_hz: true,
  requested_at: true,
  expires_at: true,
  last_delivered_at: true,
  delivery_count: true,
  completed_at: true,
};

export const calibrationRepository = {
  expirePendingForDevice(deviceId) {
    return prisma.calibrationCommand.updateMany({
      where: {
        device_id: deviceId,
        status: "PENDING",
        expires_at: { lte: new Date() },
      },
      data: { status: "EXPIRED" },
    });
  },

  findOpenCommandForDevice(deviceId) {
    return prisma.calibrationCommand.findFirst({
      where: {
        device_id: deviceId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      select: commandSelect,
    });
  },

  createCommand(data) {
    return prisma.calibrationCommand.create({
      data,
      select: commandSelect,
    });
  },

  findNextPendingCommand(deviceId) {
    return prisma.calibrationCommand.findFirst({
      where: {
        device_id: deviceId,
        status: "PENDING",
        expires_at: { gt: new Date() },
      },
      orderBy: { requested_at: "asc" },
      select: commandSelect,
    });
  },

  markCommandDelivered(commandId) {
    return prisma.calibrationCommand.updateMany({
      where: {
        command_id: commandId,
        status: "PENDING",
      },
      data: {
        last_delivered_at: new Date(),
        delivery_count: { increment: 1 },
      },
    });
  },

  findActiveCalibration(deviceId) {
    return prisma.calibration.findFirst({
      where: {
        device_id: deviceId,
        is_active: true,
      },
      select: calibrationSelect,
    });
  },

  async storeCalibrationResult({ deviceId, commandId, data }) {
    return prisma.$transaction(async (tx) => {
      const command = await tx.calibrationCommand.findUnique({
        where: { command_id: commandId },
        include: {
          calibration: {
            select: calibrationSelect,
          },
          device: {
            select: {
              user_id: true,
            },
          },
        },
      });

      if (!command) {
        throw new AppError("Calibration command was not found", 404);
      }

      if (command.device_id !== deviceId) {
        throw new AppError(
          "This device is not authorized for the calibration command",
          403,
        );
      }

      // Safe retry: return the first saved calibration instead of duplicating it.
      if (command.status === "COMPLETED" && command.calibration) {
        return {
          calibration: command.calibration,
          alreadyAccepted: true,
        };
      }

      if (command.status !== "PENDING") {
        throw new AppError(
          "Calibration command is not available for submission",
          409,
        );
      }

      if (command.expires_at <= new Date()) {
        await tx.calibrationCommand.update({
          where: { command_id: command.command_id },
          data: { status: "EXPIRED" },
        });

        return { expired: true };
      }

      if (
        !command.device.user_id ||
        command.device.user_id !== command.user_id
      ) {
        throw new AppError(
          "The device ownership changed before calibration completed",
          409,
        );
      }

      // Atomically claim the command. Duplicate firmware requests cannot both win.
      const claimed = await tx.calibrationCommand.updateMany({
        where: {
          command_id: command.command_id,
          status: "PENDING",
          expires_at: { gt: new Date() },
        },
        data: { status: "PROCESSING" },
      });

      if (claimed.count !== 1) {
        const latest = await tx.calibrationCommand.findUnique({
          where: { command_id: command.command_id },
          include: {
            calibration: {
              select: calibrationSelect,
            },
          },
        });

        if (latest?.status === "COMPLETED" && latest.calibration) {
          return {
            calibration: latest.calibration,
            alreadyAccepted: true,
          };
        }

        throw new AppError(
          "Calibration command is already being processed",
          409,
        );
      }

      await tx.calibration.updateMany({
        where: {
          device_id: deviceId,
          is_active: true,
        },
        data: { is_active: false },
      });

      const calibration = await tx.calibration.create({
        data: {
          command_id: command.command_id,
          device_id: deviceId,
          user_id: command.user_id,
          baseline_pitch: data.baselinePitch,
          baseline_roll: data.baselineRoll,
          baseline_yaw: null,
          sample_count: data.sampleCount,
          sampling_rate_hz: data.samplingRateHz,
          pitch_std_dev: data.pitchStdDev,
          roll_std_dev: data.rollStdDev,
          algorithm_version: data.algorithmVersion,
          captured_at: data.capturedAt,
          is_active: true,
          calibrated_at: new Date(),
        },
        select: calibrationSelect,
      });

      await tx.calibrationCommand.update({
        where: { command_id: command.command_id },
        data: {
          status: "COMPLETED",
          completed_at: new Date(),
        },
      });

      return {
        calibration,
        alreadyAccepted: false,
      };
    });
  },
};
