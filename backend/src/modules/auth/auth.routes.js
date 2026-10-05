import { Router } from "express";
import { login, logout, register, getCurrentUser } from "./auth.controller.js";
import { validateLogin,validateRegister } from "./auth.validator.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user session management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: The user's full name
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 72
 *                 description: Must be between 8 and 72 characters
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Request validation failed (e.g., invalid email or password too short)
 *       409:
 *         description: Email is already registered
 */

router.post("/register", validateRegister, asyncHandler(register));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful. Sets an HTTP-only cookie and returns the user token.
 *       400:
 *         description: Request validation failed
 *       401:
 *         description: Invalid email or password
 */

router.post("/login", validateLogin, asyncHandler(login));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful. Clears the HTTP-only auth cookie.
 *       401:
 *         description: Authentication token is required, invalid, or expired
 */


router.post("/logout", authenticate, asyncHandler(logout));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user retrieved successfully
 *       401:
 *         description: Authentication token is required, invalid, or expired
 */
router.get("/me", authenticate, asyncHandler(getCurrentUser));

export default router;