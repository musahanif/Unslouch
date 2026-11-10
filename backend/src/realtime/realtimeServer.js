import jwt from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";

import { env } from "../config/env.js";
import { authRepository } from "../modules/auth/auth.repository.js";
import { deviceRepository } from "../modules/devices/device.repository.js";
import { sessionRepository } from "../modules/sessions/session.repository.js";
import {
  hashDeviceSecret,
  safelyMatchesHash,
} from "../utils/deviceCredentials.js";

const userMessageSchema = z.object({
  type: z.literal("subscribe"),
  deviceId: z.string().cuid(),
});

const postureStatusSchema = z.object({
  type: z.literal("posture_status"),
  sessionId: z.string().cuid(),
  calibrationId: z.string().cuid(),
  status: z.enum(["NEUTRAL", "UNFAVORABLE", "UNKNOWN"]),
  pitchDeviation: z.number().finite().min(-90).max(90),
  rollDeviation: z.number().finite().min(-90).max(90),
  batteryLevel: z.number().int().min(0).max(100).optional(),
  observedAt: z.coerce.date(),
});

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const clients = new Set();
const lastDeviceStatusAt = new Map();

const send = (socket, payload) => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
};

const rejectUpgrade = (socket, statusCode, message) => {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
};

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");

        return separator === -1
          ? [part, ""]
          : [
              part.slice(0, separator),
              decodeURIComponent(part.slice(separator + 1)),
            ];
      }),
  );

const validateBrowserOrigin = (request) => {
  const origin = request.headers.origin;

  if (
    origin &&
    !allowedOrigins.includes("*") &&
    !allowedOrigins.includes(origin)
  ) {
    throw new Error("WebSocket origin is not allowed");
  }
};

const authenticateUserSocket = async (request) => {
  validateBrowserOrigin(request);

  const cookies = parseCookies(request.headers.cookie);
  const token = cookies.unslouch_token;

  if (!token) {
    throw new Error("Authentication cookie is required");
  }

  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
  });

  if (
    typeof payload !== "object" ||
    !payload.sub ||
    !payload.email
  ) {
    throw new Error("Authentication token is invalid");
  }

  const user = await authRepository.findUserByEmail(payload.email);

  if (!user || user.user_id !== payload.sub) {
    throw new Error("Authenticated user is unavailable");
  }

  return user;
};

const authenticateDeviceSocket = async (request) => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new Error("Device credential is required");
  }

  const [scheme, credential] = authorization.trim().split(/\s+/);

  if (scheme !== "Device" || !credential) {
    throw new Error("Device credential format is invalid");
  }

  const [deviceId, secret, extra] = credential.split(".");

  if (!deviceId || !secret || extra) {
    throw new Error("Device credential is invalid");
  }

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
    throw new Error("Device credential is invalid or revoked");
  }

  return deviceRepository.markSeen(device.device_id);
};

const broadcastPostureStatus = (userId, deviceId, payload) => {
  for (const socket of clients) {
    if (
      socket.clientType === "user" &&
      socket.userId === userId &&
      socket.subscriptions.has(deviceId)
    ) {
      send(socket, payload);
    }
  }
};

const configureUserSocket = (socket, user) => {
  socket.clientType = "user";
  socket.userId = user.user_id;
  socket.subscriptions = new Set();
  socket.isAlive = true;

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", async (raw, isBinary) => {
    if (isBinary) {
      send(socket, {
        type: "error",
        message: "Binary messages are not supported",
      });
      return;
    }

    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, {
        type: "error",
        message: "Message must contain valid JSON",
      });
      return;
    }

    const result = userMessageSchema.safeParse(message);

    if (!result.success) {
      send(socket, {
        type: "error",
        message: "Invalid WebSocket message",
      });
      return;
    }

    const device = await deviceRepository.findOwnedByUser(
      result.data.deviceId,
      user.user_id,
    );

    if (!device) {
      send(socket, {
        type: "error",
        message: "Device was not found",
      });
      return;
    }

    socket.subscriptions.add(device.device_id);

    send(socket, {
      type: "subscribed",
      deviceId: device.device_id,
    });
  });
};

const configureDeviceSocket = (socket, device) => {
  socket.clientType = "device";
  socket.deviceId = device.device_id;
  socket.isAlive = true;

  socket.on("pong", () => {
    socket.isAlive = true;
  });

  socket.on("message", async (raw, isBinary) => {
    if (isBinary) {
      send(socket, {
        type: "error",
        message: "Binary messages are not supported",
      });
      return;
    }

    let message;

    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, {
        type: "error",
        message: "Message must contain valid JSON",
      });
      return;
    }

    const result = postureStatusSchema.safeParse(message);

    if (!result.success) {
      send(socket, {
        type: "error",
        message: "Invalid posture-status payload",
      });
      return;
    }

    const data = result.data;

    // Maximum one update every 750 ms per device.
    const now = Date.now();
    const lastStatusAt = lastDeviceStatusAt.get(device.device_id) ?? 0;

    if (now - lastStatusAt < 750) {
      return;
    }

    const session = await sessionRepository.findActiveForDevice(
      device.device_id,
    );

    if (
      !session ||
      session.session_id !== data.sessionId ||
      session.calibration_id !== data.calibrationId
    ) {
      send(socket, {
        type: "error",
        message: "Session or calibration is not active for this device",
      });
      return;
    }

    lastDeviceStatusAt.set(device.device_id, now);

    const payload = {
      type: "posture_status",
      deviceId: device.device_id,
      sessionId: data.sessionId,
      calibrationId: data.calibrationId,
      status: data.status,
      pitchDeviation: data.pitchDeviation,
      rollDeviation: data.rollDeviation,
      batteryLevel: data.batteryLevel,
      observedAt: data.observedAt.toISOString(),
    };

    broadcastPostureStatus(
      session.user_id,
      device.device_id,
      payload,
    );
  });
};

export const attachRealtimeServer = (httpServer) => {
  const userWss = new WebSocketServer({
    noServer: true,
    clientTracking: false,
  });

  const deviceWss = new WebSocketServer({
    noServer: true,
    clientTracking: false,
  });

  httpServer.on("upgrade", (request, socket, head) => {
    void (async () => {
      const url = new URL(
        request.url,
        `http://${request.headers.host}`,
      );

      try {
        if (url.pathname === "/ws/user") {
          const user = await authenticateUserSocket(request);

          userWss.handleUpgrade(request, socket, head, (ws) => {
            clients.add(ws);
            configureUserSocket(ws, user);

            ws.on("close", () => clients.delete(ws));

            send(ws, {
              type: "connected",
              role: "user",
            });
          });

          return;
        }

        if (url.pathname === "/ws/device") {
          const device = await authenticateDeviceSocket(request);

          deviceWss.handleUpgrade(request, socket, head, (ws) => {
            clients.add(ws);
            configureDeviceSocket(ws, device);

            ws.on("close", () => {
              clients.delete(ws);
              lastDeviceStatusAt.delete(device.device_id);
            });

            send(ws, {
              type: "connected",
              role: "device",
            });
          });

          return;
        }

        rejectUpgrade(socket, 404, "Not Found");
      } catch {
        rejectUpgrade(socket, 401, "Unauthorized");
      }
    })();
  });

  const heartbeatTimer = setInterval(() => {
    for (const socket of clients) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }

      socket.isAlive = false;
      socket.ping();
    }
  }, 30_000);

  heartbeatTimer.unref();

  return {
    close: () =>
      new Promise((resolve) => {
        clearInterval(heartbeatTimer);

        for (const socket of clients) {
          socket.terminate();
        }

        userWss.close();
        deviceWss.close(resolve);
      }),
  };
};