import { Router } from "express";
import { login, logout, register, getCurrentUser } from "./auth.controller.js";
import { validateLogin,validateRegister } from "./auth.validator.js";
import { authenticate } from "../../middlewares/authMiddleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.post("/register", validateRegister, asyncHandler(register));
router.post("/login", validateLogin, asyncHandler(login));
router.post("/logout", authenticate, asyncHandler(logout));
router.get("/me", authenticate, asyncHandler(getCurrentUser));

export default router;