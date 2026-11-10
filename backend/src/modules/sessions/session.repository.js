import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

const calibrationSelect = {
  calibration_id: true,
  baseline_pitch: true,
  baseline_roll: true,
  algorithm_version: true,
  calibrated_at: true,
};

const sessionSelect = {
  session_id: true,
  user_id: true,
  device_id: true,
  calibration_id: true,
  start_time: true,
  end_time: true,
  total_good_posture_sec: true,
  total_slouch_sec: true,
  status: true,
  telemetry_revision: true,
  calibration: {
    select: calibrationSelect,
  },
};

export const sessionRepository = {
  create(data) {
    return prisma.session.create({
      data,
      select: sessionSelect,
    });
  },

  findActiveForDevice(deviceId) {
    return prisma.session.findFirst({
      where: {
        device_id: deviceId,
        status: "ACTIVE",
      },
      select: sessionSelect,
    });
  },

  findOpenForDevice(deviceId) {
    return prisma.session.findFirst({
      where: {
        device_id: deviceId,
        status: {
          in: ["ACTIVE", "FINISHING"],
        },
      },
      select: sessionSelect,
    });
  },

  findOwnedByUser(sessionId, userId) {
    return prisma.session.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId,
      },
      select: sessionSelect,
    });
  },

  listForUser(userId, limit) {
    return prisma.session.findMany({
      where: { user_id: userId },
      select: sessionSelect,
      orderBy: {
        start_time: "desc",
      },
      take: limit,
    });
  },

  async requestOwnedSessionCompletion(sessionId, userId) {
    const existing = await this.findOwnedByUser(sessionId, userId);

    if (!existing) {
      throw new AppError("Session was not found", 404);
    }

    if (existing.status === "COMPLETED") {
      return {
        session: existing,
        alreadyCompleted: true,
        alreadyRequested: false,
      };
    }

    if (existing.status === "FINISHING") {
      return {
        session: existing,
        alreadyCompleted: false,
        alreadyRequested: true,
      };
    }

    if (existing.status !== "ACTIVE") {
      throw new AppError("Only an active session can be completed", 409);
    }

    const updated = await prisma.session.updateMany({
      where: {
        session_id: sessionId,
        user_id: userId,
        status: "ACTIVE",
      },
      data: {
        status: "FINISHING",
      },
    });

    if (updated.count === 1) {
      return {
        session: await this.findOwnedByUser(sessionId, userId),
        alreadyCompleted: false,
        alreadyRequested: false,
      };
    }

    const latest = await this.findOwnedByUser(sessionId, userId);

    if (latest?.status === "FINISHING") {
      return {
        session: latest,
        alreadyCompleted: false,
        alreadyRequested: true,
      };
    }

    if (latest?.status === "COMPLETED") {
      return {
        session: latest,
        alreadyCompleted: true,
        alreadyRequested: false,
      };
    }

    throw new AppError(
      "Session state changed before completion could finish",
      409,
    );
  },

  async finalizeFinishingSession(sessionId, deviceId) {
    const existing = await prisma.session.findFirst({
      where: {
        session_id: sessionId,
        device_id: deviceId,
      },
      select: sessionSelect,
    });

    if (!existing) {
      throw new AppError("Session was not found", 404);
    }

    if (existing.status === "COMPLETED") {
      return {
        session: existing,
        alreadyCompleted: true,
      };
    }

    if (existing.status !== "FINISHING") {
      throw new AppError(
        "Session has not requested device finalization",
        409,
      );
    }

    const updated = await prisma.session.updateMany({
      where: {
        session_id: sessionId,
        device_id: deviceId,
        status: "FINISHING",
      },
      data: {
        status: "COMPLETED",
        end_time: new Date(),
      },
    });

    if (updated.count === 1) {
      return {
        session: await prisma.session.findFirst({
          where: {
            session_id: sessionId,
            device_id: deviceId,
          },
          select: sessionSelect,
        }),
        alreadyCompleted: false,
      };
    }

    const latest = await prisma.session.findFirst({
      where: {
        session_id: sessionId,
        device_id: deviceId,
      },
      select: sessionSelect,
    });

    if (latest?.status === "COMPLETED") {
      return {
        session: latest,
        alreadyCompleted: true,
      };
    }

    throw new AppError(
      "Session state changed before device finalization could finish",
      409,
    );
  },
};