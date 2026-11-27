import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  register,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmail,
} from "./auth.controller.js";
import {
  validateLogin,
  validateRegister,
  validateRequestPasswordReset,
  validateResendVerification,
  validateResetPassword,
  validateVerifyEmail,
} from "./auth.validator.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User registration, email verification, password reset, and cookie-based authentication
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new account and send an email verification OTP
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
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 72
 *                 example: securepassword123
 *     responses:
 *       201:
 *         description: Account created. An email verification OTP was sent.
 *       400:
 *         description: Invalid request body
 *       409:
 *         description: Email is already registered
 *       503:
 *         description: Account was created but verification email delivery failed
 */
router.post("/register", validateRegister, asyncHandler(register));

/**
 * @swagger
 * /api/auth/email-verification/verify:
 *   post:
 *     summary: Verify an email address with a six-digit OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 pattern: "^[0-9]{6}$"
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully. Sets the HTTP-only authentication cookie.
 *       400:
 *         description: Verification code is invalid or expired
 *       409:
 *         description: Email address is already verified
 */
router.post(
  "/email-verification/verify",
  validateVerifyEmail,
  asyncHandler(verifyEmail),
);

/**
 * @swagger
 * /api/auth/email-verification/resend:
 *   post:
 *     summary: Resend the email verification OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Generic success response to prevent account enumeration
 *       400:
 *         description: Invalid request body
 */
router.post(
  "/email-verification/resend",
  validateResendVerification,
  asyncHandler(resendEmailVerification),
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Sign in with an email and password
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
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: securepassword123
 *     responses:
 *       200:
 *         description: Login successful. Sets an HTTP-only authentication cookie.
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Email address has not been verified
 */
router.post("/login", validateLogin, asyncHandler(login));

/**
 * @swagger
 * /api/auth/password-reset/request:
 *   post:
 *     summary: Request a single-use password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Generic success response. A reset link is sent only for eligible accounts.
 *       400:
 *         description: Invalid request body
 */
router.post(
  "/password-reset/request",
  validateRequestPasswordReset,
  asyncHandler(requestPasswordReset),
);

/**
 * @swagger
 * /api/auth/password-reset:
 *   post:
 *     summary: Reset a password using a single-use reset link token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: The token extracted by the frontend from the reset-link URL fragment
 *                 example: reset-token-from-email-link
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 72
 *                 example: newsecurepassword123
 *     responses:
 *       200:
 *         description: Password reset successfully. Existing login sessions are invalidated.
 *       400:
 *         description: Reset link is invalid, expired, or already used
 */
router.post(
  "/password-reset",
  validateResetPassword,
  asyncHandler(resetPassword),
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Sign out the current user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful. Clears the HTTP-only authentication cookie.
 *       401:
 *         description: Authentication cookie is missing, expired, or invalid
 */
router.post("/logout", authenticate, asyncHandler(logout));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current authenticated user's profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile returned successfully
 *       401:
 *         description: Authentication cookie is missing, expired, or invalid
 */
router.get("/me", authenticate, asyncHandler(getCurrentUser));

export default router;
