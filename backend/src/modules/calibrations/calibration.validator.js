import { z } from "zod";
import { AppError } from "../../utils/AppError.js";

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = {};

    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      errors[key] ??= issue.message;
    }

    next(new AppError("Request validation failed", 400, errors));
    return;
  }

  req.validatedBody = result.data;
  next();
};

const calibrationRequestSchema = z
  .object({
    sampleCount: z.number().int().min(100).max(1000).default(300),
    samplingRateHz: z.number().int().min(20).max(200).default(50),
  })
  .strict();

const calibrationResultSchema = z
  .object({
    commandId: z.string().cuid("Calibration command ID is invalid"),
    baselinePitch: z.number().finite().min(-90).max(90),
    baselineRoll: z.number().finite().min(-90).max(90),
    sampleCount: z.number().int().min(100).max(1000),
    samplingRateHz: z.number().int().min(20).max(200),
    pitchStdDev: z.number().finite().min(0).max(5),
    rollStdDev: z.number().finite().min(0).max(5),
    algorithmVersion: z.string().trim().min(1).max(100),
    capturedAt: z.coerce
      .date()
      .refine(
        (value) => value.getTime() <= Date.now() + 5 * 60 * 1000,
        "capturedAt cannot be more than five minutes in the future",
      ),
  })
  .strict();

export const validateCalibrationRequest = validate(calibrationRequestSchema);

export const validateCalibrationResult = validate(calibrationResultSchema);
