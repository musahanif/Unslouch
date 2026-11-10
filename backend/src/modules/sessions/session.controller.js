import { sendSuccess } from "../../utils/apiResponse.js";
import { sessionService } from "./session.service.js";

export const createSession = async (req, res) => {
  const session = await sessionService.createSession(
    req.user.user_id,
    req.validatedBody.deviceId,
  );

  return sendSuccess(res, {
    statusCode: 201,
    message: "Session started successfully",
    data: { session },
  });
};

export const listSessions = async (req, res) => {
  const sessions = await sessionService.listSessions(
    req.user.user_id,
    req.validatedQuery.limit,
  );

  return sendSuccess(res, {
    message: "Sessions retrieved successfully",
    data: { sessions },
  });
};

export const getSession = async (req, res) => {
  const session = await sessionService.getSession(
    req.user.user_id,
    req.validatedParams.sessionId,
  );

  return sendSuccess(res, {
    message: "Session retrieved successfully",
    data: { session },
  });
};

export const completeSession = async (req, res) => {
  const result = await sessionService.completeSession(
    req.user.user_id,
    req.validatedParams.sessionId,
  );

  return sendSuccess(res, {
    message: result.alreadyCompleted
      ? "Session was already completed"
      : result.alreadyRequested
        ? "Session completion was already requested"
        : "Session is waiting for the device to finish uploading telemetry",
    data: result,
  });
};

export const finalizeDeviceSession = async (req, res) => {
  const result = await sessionService.finalizeSessionForDevice(
    req.device.device_id,
    req.validatedParams.sessionId,
  );

  return sendSuccess(res, {
    message: result.alreadyCompleted
      ? "Session was already completed"
      : "Session finalized successfully",
    data: result,
  });
};

export const getActiveDeviceSession = async (req, res) => {
  const session = await sessionService.getOpenSessionForDevice(
    req.device.device_id,
  );

  return sendSuccess(res, {
    message: session
      ? "Active session retrieved successfully"
      : "No active session exists for this device",
    data: {
      session: session
        ? {
            sessionId: session.session_id,
            status: session.status,
            finishRequested: session.status === "FINISHING",
            startedAt: session.start_time,
            calibration: session.calibration
              ? {
                  calibrationId: session.calibration.calibration_id,
                  baselinePitch: session.calibration.baseline_pitch,
                  baselineRoll: session.calibration.baseline_roll,
                  algorithmVersion: session.calibration.algorithm_version,
                }
              : null,
          }
        : null,
    },
  });
};
