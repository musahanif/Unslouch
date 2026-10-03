import { AppError } from "../utils/AppError.js";

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user) {
    next(new AppError("Authentication is required", 401));
    return;
  }

  if (!roles.includes(req.user.role)) {
    next(new AppError("You do not have permission to access this resource", 403));
    return;
  }

  next();
};
