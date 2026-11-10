import { sendSuccess } from "../../utils/apiResponse.js";
import { calibrationService } from "./calibration.service.js";

export const requestCalibration = async (req, res) => {
  const command = await calibrationService.requestCalibration(
    req.user.user_id,
    req.validatedParams.deviceId,
    req.validatedBody,
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Calibration requested successfully",
    data: { command },
  });
};

export const getNextCalibrationRequest = async (req, res) => {
  const command = await calibrationService.getNextCommand(req.device.device_id);

  return sendSuccess(res, {
    message: command
      ? "Calibration request is available"
      : "No calibration request is pending",
    data: {
      command: command
        ? {
            commandId: command.command_id,
            requiredPose: command.required_pose,
            sampleCount: command.sample_count,
            samplingRateHz: command.sampling_rate_hz,
            expiresAt: command.expires_at,
          }
        : null,
    },
  });
};

export const submitCalibration = async (req, res) => {
  const result = await calibrationService.submitCalibration(
    req.device.device_id,
    req.validatedBody,
  );

  return sendSuccess(res, {
    statusCode: result.alreadyAccepted ? 200 : 201,
    message: result.alreadyAccepted
      ? "Calibration was already accepted"
      : "Calibration stored successfully",
    data: result,
  });
};

export const getActiveCalibration = async (req, res) => {
  const calibration = await calibrationService.getActiveCalibration(
    req.user.user_id,
    req.validatedParams.deviceId,
  );

  return sendSuccess(res, {
    message: calibration
      ? "Active calibration retrieved successfully"
      : "No active calibration exists for this device",
    data: { calibration },
  });
};
