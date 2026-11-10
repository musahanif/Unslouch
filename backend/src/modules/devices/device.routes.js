import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authenticateDevice } from "../../middlewares/deviceAuthMiddleware.js";
import {
  getCurrentDevice,
  getDevice,
  heartbeat,
  listDevices,
  pairDevice,
  rotateDeviceCredential,
  activatePendingCredential
} from "./device.controller.js";
import {
  validateDeviceIdParam,
  validateHeartbeat,
  validatePairDevice,
  validateActivatePendingCredential
} from "./device.validator.js";

const userDeviceRoutes = Router();
const firmwareDeviceRoutes = Router();

/**
 * @swagger
 * tags:
 *   - name: User Devices
 *     description: User-facing device management and pairing
 *   - name: Firmware Devices
 *     description: Hardware-facing endpoints for device authentication and telemetry
 */

/**
 * @swagger
 * /api/devices/pair:
 *   post:
 *     summary: Pair a new device to the current user
 *     tags: [User Devices]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serialNumber
 *               - setupCode
 *             properties:
 *               serialNumber:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 100
 *                 description: The device's serial number (automatically transformed to uppercase)
 *               setupCode:
 *                 type: string
 *                 minLength: 12
 *                 maxLength: 128
 *                 description: The setup code provided with the device
 *     responses:
 *       201:
 *         description: Device paired successfully. Returns the device details and the single-issue secret credential.
 *       400:
 *         description: Request validation failed
 *       401:
 *         description: Invalid device pairing details or authentication required
 *       409:
 *         description: Device has already been paired
 */

userDeviceRoutes.post(
  "/pair",
  authenticate,
  validatePairDevice,
  asyncHandler(pairDevice),
);

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: List all devices owned by the current user
 *     tags: [User Devices]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Devices retrieved successfully
 *       401:
 *         description: Authentication required
 */

userDeviceRoutes.get(
  "/",
  authenticate,
  asyncHandler(listDevices),
);

/**
 * @swagger
 * /api/devices/{deviceId}:
 *   get:
 *     summary: Get details of a specific device
 *     tags: [User Devices]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The CUID of the device
 *     responses:
 *       200:
 *         description: Device retrieved successfully
 *       400:
 *         description: Invalid device ID format
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Device not found or not owned by user
 */
userDeviceRoutes.get(
  "/:deviceId",
  authenticate,
  validateDeviceIdParam,
  asyncHandler(getDevice),
);

/**
  * @swagger
  * /api/devices/{deviceId}/credentials/rotate:
  *   post:
  *     summary: Stage a new device credential. The current credential remains active until the physical device confirms activation.
  *     tags: [User Devices]
  *     security:
  *       - cookieAuth: []
  *     parameters:
  *       - in: path
  *         name: deviceId
  *         required: true
  *         schema:
  *           type: string
  *         description: The CUID of the device
  *     responses:
  *       200:
  *         description: Device credential rotated successfully. Returns the newly generated secret.
  *       400:
  *         description: Invalid device ID format
  *       401:
  *         description: Authentication required
  *       404:
  *         description: Device not found or not owned by user
  *       409:
  *         description: A credential rotation is already pending for this device
  */
userDeviceRoutes.post(
  "/:deviceId/credentials/rotate",
  authenticate,
  validateDeviceIdParam,
  asyncHandler(rotateDeviceCredential),
);


//Firmware Device Route

/**
 * @swagger
 * /api/device/me:
 *   get:
 *     summary: Get the currently authenticated device's profile
 *     tags: [Firmware Devices]
 *     security:
 *       - deviceAuth: []
 *     responses:
 *       200:
 *         description: Device authenticated successfully
 *       401:
 *         description: Device authentication token is required, invalid, or expired
 */
firmwareDeviceRoutes.get(
  "/me",
  authenticateDevice,
  asyncHandler(getCurrentDevice),
);


/**
 * @swagger
 * /api/device/heartbeat:
 *   post:
 *     summary: Record a device heartbeat (telemetry)
 *     tags: [Firmware Devices]
 *     security:
 *       - deviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batteryLevel:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Current battery percentage
 *               firmwareVersion:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: The current firmware version installed on the device
 *             description: At least one field (batteryLevel or firmwareVersion) must be provided
 *     responses:
 *       200:
 *         description: Device heartbeat recorded successfully
 *       400:
 *         description: Request validation failed (e.g., missing all optional fields)
 *       401:
 *         description: Device authentication failed
 */
firmwareDeviceRoutes.post(
  "/heartbeat",
  authenticateDevice,
  validateHeartbeat,
  asyncHandler(heartbeat),
);

/**
  * @swagger
  * /api/device/credentials/activate:
  *   post:
  *     summary: Activate a pending device credential
  *     tags: [Firmware Devices]
  *     security:
  *       - deviceAuth: []
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             required:
  *               - secret
  *             properties:
  *               secret:
  *                 type: string
  *                 minLength: 32
  *                 maxLength: 128
  *                 pattern: "^[A-Za-z0-9_-]+$"
  *                 description: The pending credential secret to activate
  *     responses:
  *       200:
  *         description: Device credential activated successfully
  *       400:
  *         description: Request validation failed (e.g., invalid secret format)
  *       401:
  *         description: Device authentication failed
  *       409:
  *         description: Pending credential is invalid, expired, or already activated
  */
firmwareDeviceRoutes.post(
  "/credentials/activate",
  authenticateDevice,
  validateActivatePendingCredential,
  asyncHandler(activatePendingCredential),
);

export { userDeviceRoutes, firmwareDeviceRoutes };