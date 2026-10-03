import { AppError } from "../utils/AppError.js";

export const notFoundMiddleware = (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found`, 404));
};
