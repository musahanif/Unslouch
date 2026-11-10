import { AppError } from "../../utils/AppError.js";
import { deviceRepository } from "../devices/device.repository.js";
import { calibrationRepository } from "./calibration.repository.js";

const CALIBRATION_COMMAND_LIFETIME_MS = 5 * 60 * 1000;
const MAX_STANDARD_DEVIATION_DEG = 1.5;

export const calibrationService = {
  async requestCalibration(userId, deviceId, options) {
    const device = await deviceRepository.findOwnedByUser(deviceId, userId);

    if (!device) {
      throw new AppError("Device was not found", 404);
    }

    await calibrationRepository.expirePendingForDevice(deviceId);

    const openCommand =
      await calibrationRepository.findOpenCommandForDevice(deviceId);

    if (openCommand) {
      throw new AppError(
        "A calibration request is already pending for this device",
        409,
      );
    }

    return calibrationRepository.createCommand({
      device_id: deviceId,
      user_id: userId,
      required_pose: "NEUTRAL_UPRIGHT_STANDING",
      sample_count: options.sampleCount,
      sampling_rate_hz: options.samplingRateHz,
      expires_at: new Date(Date.now() + CALIBRATION_COMMAND_LIFETIME_MS),
    });
  },

  async getNextCommand(deviceId) {
    await calibrationRepository.expirePendingForDevice(deviceId);

    const command =
      await calibrationRepository.findNextPendingCommand(deviceId);

    if (!command) {
      return null;
    }

    await calibrationRepository.markCommandDelivered(command.command_id);

    return command;
  },

  async submitCalibration(deviceId, data) {
    if (
      data.pitchStdDev > MAX_STANDARD_DEVIATION_DEG ||
      data.rollStdDev > MAX_STANDARD_DEVIATION_DEG
    ) {
      throw new AppError(
        "Calibration is unstable. Keep the device still in a neutral upright standing pose and try again.",
        422,
        {
          maxStandardDeviationDeg: MAX_STANDARD_DEVIATION_DEG,
        },
      );
    }

    const result = await calibrationRepository.storeCalibrationResult({
      deviceId,
      commandId: data.commandId,
      data,
    });

    if (result.expired) {
      throw new AppError("Calibration command has expired", 410);
    }

    return result;
  },

  async getActiveCalibration(userId, deviceId) {
    const device = await deviceRepository.findOwnedByUser(deviceId, userId);

    if (!device) {
      throw new AppError("Device was not found", 404);
    }

    return calibrationRepository.findActiveCalibration(deviceId);
  },
};
