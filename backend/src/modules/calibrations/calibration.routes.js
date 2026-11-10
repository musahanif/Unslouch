import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authenticateDevice } from "../../middlewares/deviceAuthMiddleware.js";
import { validateDeviceIdParam } from "../devices/device.validator.js";
import {
  getActiveCalibration,
  getNextCalibrationRequest,
  requestCalibration,
  submitCalibration,
} from "./calibration.controller.js";
import {
  validateCalibrationRequest,
  validateCalibrationResult,
} from "./calibration.validator.js";

const userCalibrationRoutes = Router();
const firmwareCalibrationRoutes = Router();


/**
 * @swagger
 * tags:
 *   - name: User Calibrations
 *     description: User-facing endpoints for requesting and retrieving device calibrations
 *   - name: Firmware Calibrations
 *     description: Hardware-facing endpoints for fetching commands and submitting calibration results
 */

/**
 * @swagger
 * /api/devices/{deviceId}/calibration-requests:
 *   post:
 *     summary: Request a new calibration for a specific device
 *     tags: [User Calibrations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: The CUID of the device
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sampleCount:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 1000
 *                 default: 300
 *                 description: Number of samples to collect
 *               samplingRateHz:
 *                 type: integer
 *                 minimum: 20
 *                 maximum: 200
 *                 default: 50
 *                 description: Sampling rate in Hz
 *     responses:
 *       201:
 *         description: Calibration requested successfully. Returns the pending command.
 *       400:
 *         description: Request validation failed
 *       404:
 *         description: Device not found or not owned by user
 *       409:
 *         description: A calibration request is already pending for this device
 */
userCalibrationRoutes.post(
  "/:deviceId/calibration-requests",
  authenticate,
  validateDeviceIdParam,
  validateCalibrationRequest,
  asyncHandler(requestCalibration),
);

/**
 * @swagger
 * /api/devices/{deviceId}/calibration:
 *   get:
 *     summary: Get the active calibration data for a specific device
 *     tags: [User Calibrations]
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
 *         description: Active calibration retrieved successfully (or null if none exists)
 *       400:
 *         description: Invalid device ID format
 *       404:
 *         description: Device not found or not owned by user
 */
userCalibrationRoutes.get(
  "/:deviceId/calibration",
  authenticate,
  validateDeviceIdParam,
  asyncHandler(getActiveCalibration),
);

// Firmware Calibration Routes

/**
 * @swagger
 * /api/device/calibration-requests/next:
 *   get:
 *     summary: Get the next pending calibration request for the authenticated device
 *     tags: [Firmware Calibrations]
 *     security:
 *       - deviceAuth: []
 *     responses:
 *       200:
 *         description: Returns the next calibration command, or null if no pending requests exist
 *       401:
 *         description: Device authentication failed
 */
firmwareCalibrationRoutes.get(
  "/calibration-requests/next",
  authenticateDevice,
  asyncHandler(getNextCalibrationRequest),
);

/**
 * @swagger
 * /api/device/calibrations:
 *   post:
 *     summary: Submit a completed calibration result from the device
 *     tags: [Firmware Calibrations]
 *     security:
 *       - deviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commandId
 *               - baselinePitch
 *               - baselineRoll
 *               - sampleCount
 *               - samplingRateHz
 *               - pitchStdDev
 *               - rollStdDev
 *               - algorithmVersion
 *               - capturedAt
 *             properties:
 *               commandId:
 *                 type: string
 *                 description: The CUID of the calibration command
 *               baselinePitch:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               baselineRoll:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               sampleCount:
 *                 type: integer
 *                 minimum: 100
 *                 maximum: 1000
 *               samplingRateHz:
 *                 type: integer
 *                 minimum: 20
 *                 maximum: 200
 *               pitchStdDev:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *               rollStdDev:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *               algorithmVersion:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               capturedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Calibration was already accepted previously (safe retry)
 *       201:
 *         description: Calibration stored successfully
 *       400:
 *         description: Request validation failed
 *       401:
 *         description: Device authentication failed
 *       403:
 *         description: Device is not authorized for this calibration command
 *       404:
 *         description: Calibration command was not found
 *       409:
 *         description: Command is not available, already processing, or device ownership changed
 *       410:
 *         description: Calibration command has expired
 *       422:
 *         description: Calibration is unstable (standard deviation exceeds 1.5 degrees)
 */
firmwareCalibrationRoutes.post(
  "/calibrations",
  authenticateDevice,
  validateCalibrationResult,
  asyncHandler(submitCalibration),
);

export { userCalibrationRoutes, firmwareCalibrationRoutes };
