import { Router } from "express";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { authenticateDevice } from "../../middlewares/deviceAuthMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  completeSession,
  createSession,
  getActiveDeviceSession,
  getSession,
  listSessions,
  finalizeDeviceSession
} from "./session.controller.js";
import {
  validateCreateSession,
  validateListSessions,
  validateSessionIdParam,
} from "./session.validator.js";

const userSessionRoutes = Router();
const firmwareSessionRoutes = Router();

/**
 * @swagger
 * tags:
 *   - name: User Sessions
 *     description: User-facing endpoints for creating, retrieving, and completing tracking sessions
 *   - name: Firmware Sessions
 *     description: Hardware-facing endpoints for devices to check active session status
 */

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     summary: Start a new tracking session for a specific device
 *     tags: [User Sessions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: The CUID of the device to start a session for
 *     responses:
 *       201:
 *         description: Session started successfully
 *       400:
 *         description: Request validation failed (e.g., invalid deviceId format)
 *       404:
 *         description: Device was not found or is not owned by the user
 *       409:
 *         description: Device is inactive, lacks an active calibration, or already has an active session
 */
userSessionRoutes.post(
  "/",
  authenticate,
  validateCreateSession,
  asyncHandler(createSession),
);

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     summary: List all tracking sessions for the current user
 *     tags: [User Sessions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of sessions to return
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       400:
 *         description: Request validation failed for query parameters
 */
userSessionRoutes.get(
  "/",
  authenticate,
  validateListSessions,
  asyncHandler(listSessions),
);

/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   get:
 *     summary: Get details of a specific tracking session
 *     tags: [User Sessions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The CUID of the session
 *     responses:
 *       200:
 *         description: Session retrieved successfully
 *       400:
 *         description: Invalid session ID format
 *       404:
 *         description: Session was not found or is not owned by the user
 */
userSessionRoutes.get(
  "/:sessionId",
  authenticate,
  validateSessionIdParam,
  asyncHandler(getSession),
);

/**
 * @swagger
 * /api/sessions/{sessionId}/complete:
 *   post:
 *     summary: Complete an active tracking session
 *     tags: [User Sessions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The CUID of the session to complete
 *     responses:
 *       200:
 *         description: Session was already completed previously (safe retry)
 *       201:
 *         description: Session completed successfully
 *       400:
 *         description: Invalid session ID format
 *       404:
 *         description: Session was not found or is not owned by the user
 *       409:
 *         description: Only an active session can be completed, or session state changed concurrently
 */
userSessionRoutes.post(
  "/:sessionId/complete",
  authenticate,
  validateSessionIdParam,
  asyncHandler(completeSession),
);

// Firmware Session Routes

/**
 * @swagger
 * /api/device/sessions/active:
 *   get:
 *     summary: Get the current active session for the authenticated device
 *     tags: [Firmware Sessions]
 *     security:
 *       - deviceAuth: []
 *     responses:
 *       200:
 *         description: Active session retrieved successfully (returns session metadata and calibration baseline, or null if no active session exists)
 *       401:
 *         description: Device authentication failed
 */ 
firmwareSessionRoutes.get(
  "/sessions/active",
  authenticateDevice,
  asyncHandler(getActiveDeviceSession),
);

firmwareSessionRoutes.post(
  "/sessions/:sessionId/finalize",
  authenticateDevice,
  validateSessionIdParam,
  asyncHandler(finalizeDeviceSession),
);

export { userSessionRoutes, firmwareSessionRoutes };
