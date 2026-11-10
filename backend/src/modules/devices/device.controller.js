import { sendSuccess } from "../../utils/apiResponse.js";
import { deviceService } from "./device.service.js";

export const pairDevice = async (req, res) => {
  const data = await deviceService.pair(req.user.user_id, req.validatedBody);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Device paired successfully",
    data,
  });
};

export const listDevices = async (req, res) =>
  sendSuccess(res, {
    message: "Devices retrieved successfully",
    data: {
      devices: await deviceService.listForUser(req.user.user_id),
    },
  });

export const getDevice = async (req, res) =>
  sendSuccess(res, {
    message: "Device retrieved successfully",
    data: {
      device: await deviceService.getOwnedDevice(
        req.user.user_id,
        req.validatedParams.deviceId,
      ),
    },
  });

export const rotateDeviceCredential = async (req, res) =>
  sendSuccess(res, {
    message: "Device credential rotated successfully",
    data: await deviceService.rotateCredential(
      req.user.user_id,
      req.validatedParams.deviceId,
    ),
  });

export const getCurrentDevice = async (req, res) =>
  sendSuccess(res, {
    message: "Device authenticated successfully",
    data: { device: req.device },
  });

export const heartbeat = async (req, res) =>
  sendSuccess(res, {
    message: "Device heartbeat recorded",
    data: {
      device: await deviceService.heartbeat(
        req.device.device_id,
        req.validatedBody,
      ),
    },
  });

export const activatePendingCredential = async (req, res) =>
  sendSuccess(res, {
    message: "Device credential activated successfully",
    data: {
      device: await deviceService.activatePendingCredential(
        req.device.device_id,
        req.validatedBody.secret,
      ),
    },
  });
