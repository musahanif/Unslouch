import { authService } from "./auth.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";

const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

const sendAuthenticatedResponse = (
  res,
  { statusCode = 200, message, data },
) => {
  res.cookie("teksid_token", data.token, authCookieOptions);

  return sendSuccess(res, {
    statusCode,
    message,
    data: {
      user: data.user,
    },
  });
};

export const register = async (req, res) => {
  const data = await authService.register(req.validatedBody);

  return sendAuthenticatedResponse(res, {
    statusCode: 201,
    message: "Registration successful",
    data,
  });
};

export const login = async (req, res) => {
  const data = await authService.login(req.validatedBody);

  return sendAuthenticatedResponse(res, {
    message: "Login successful",
    data,
  });
};

export const logout = async (_req, res) => {
  res.clearCookie("teksid_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  sendSuccess(res, {
    message: "Logout successful.",
  });
};

export const getCurrentUser = async (req, res) =>
  sendSuccess(res, {
    message: "Current user retrieved",
    data: { user: authService.getProfile(req.user) },
  });
