import { AppError } from "../../utils/AppError.js";
import { calibrationRepository } from "../calibrations/calibration.repository.js";
import { deviceRepository } from "../devices/device.repository.js";
import { sessionRepository } from "./session.repository.js";

export const sessionService = {
  async createSession(userId, deviceId) {
    const device = await deviceRepository.findOwnedByUser(deviceId, userId);

    if (!device) {
      throw new AppError("Device was not found", 404);
    }

    if (!device.is_active) {
      throw new AppError("Device is inactive", 409);
    }

    const calibration =
      await calibrationRepository.findActiveCalibration(deviceId);

    if (!calibration) {
      throw new AppError(
        "An active calibration is required before starting a session",
        409,
      );
    }

    const existingSession = await sessionRepository.findOpenForDevice(deviceId);

    if (existingSession) {
      throw new AppError("This device already has an active session", 409, {
        activeSessionId: existingSession.session_id,
      });
    }

    return sessionRepository.create({
      user_id: userId,
      device_id: deviceId,
      calibration_id: calibration.calibration_id,
      start_time: new Date(),
      status: "ACTIVE",
    });
  },

  async listSessions(userId, limit) {
    return sessionRepository.listForUser(userId, limit);
  },

  async getSession(userId, sessionId) {
    const session = await sessionRepository.findOwnedByUser(sessionId, userId);

    if (!session) {
      throw new AppError("Session was not found", 404);
    }

    return session;
  },

  completeSession(userId, sessionId) {
    return sessionRepository.requestOwnedSessionCompletion(sessionId, userId);
  },

  finalizeSessionForDevice(deviceId, sessionId) {
    return sessionRepository.finalizeFinishingSession(sessionId, deviceId);
  },

  getOpenSessionForDevice(deviceId) {
    return sessionRepository.findOpenForDevice(deviceId);
  },
};
