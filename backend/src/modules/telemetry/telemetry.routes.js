import { Router } from "express";
import { authenticateDevice } from "../../middlewares/deviceAuthMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadTelemetryBatch } from "./telemetry.controller.js";
import { validateTelemetryBatch } from "./telemetry.validator.js";

const telemetryRoutes = Router();

/**
 * @swagger
 * tags:
 *   - name: Firmware Telemetry
 *     description: Hardware-facing endpoints for uploading raw sensor data batches
 */

/**
 * @swagger
 * /api/telemetry/batches:
 *   post:
 *     summary: Upload a batch of raw sensor telemetry data from the device
 *     tags: [Firmware Telemetry]
 *     security:
 *       - deviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - batchId
 *               - samplingRateHz
 *               - startedAt
 *               - samples
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: The CUID of the active session
 *               batchId:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 128
 *                 pattern: "^[A-Za-z0-9][A-Za-z0-9_-]*$"
 *                 description: Client-generated unique identifier for this batch to ensure safe retries
 *               samplingRateHz:
 *                 type: integer
 *                 minimum: 20
 *                 maximum: 200
 *                 description: The sampling rate of the sensor data
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *                 description: The start time of the data capture
 *               samples:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 200
 *                 description: Array of sequential telemetry samples
 *                 items:
 *                   type: object
 *                   required:
 *                     - index
 *                     - offsetMs
 *                     - ax
 *                     - ay
 *                     - az
 *                     - gx
 *                     - gy
 *                     - gz
 *                   properties:
 *                     index:
 *                       type: integer
 *                       minimum: 0
 *                       description: Sequential sample index starting at 0
 *                     offsetMs:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 60000
 *                       description: Time offset in milliseconds since the batch started
 *                     ax:
 *                       type: number
 *                       minimum: -32
 *                       maximum: 32
 *                       description: Accelerometer X-axis value in g
 *                     ay:
 *                       type: number
 *                       minimum: -32
 *                       maximum: 32
 *                       description: Accelerometer Y-axis value in g
 *                     az:
 *                       type: number
 *                       minimum: -32
 *                       maximum: 32
 *                       description: Accelerometer Z-axis value in g
 *                     gx:
 *                       type: number
 *                       minimum: -4000
 *                       maximum: 4000
 *                       description: Gyroscope X-axis value in degrees/sec
 *                     gy:
 *                       type: number
 *                       minimum: -4000
 *                       maximum: 4000
 *                       description: Gyroscope Y-axis value in degrees/sec
 *                     gz:
 *                       type: number
 *                       minimum: -4000
 *                       maximum: 4000
 *                       description: Gyroscope Z-axis value in degrees/sec
 *     responses:
 *       200:
 *         description: Telemetry batch was already accepted previously (idempotent safe retry)
 *       201:
 *         description: Telemetry batch stored successfully
 *       400:
 *         description: Request validation failed (e.g., sample indexes not consecutive, offsets not increasing)
 *       401:
 *         description: Device authentication failed
 *       409:
 *         description: Batch ID reused with different contents, or the session is inactive/unassigned to this device
 */
telemetryRoutes.post(
  "/batches",
  authenticateDevice,
  validateTelemetryBatch,
  asyncHandler(uploadTelemetryBatch),
);

export default telemetryRoutes;
