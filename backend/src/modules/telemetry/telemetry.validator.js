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

const finiteNumber = z.number().finite();

const sampleSchema = z
  .object({
    index: z.number().int().min(0),
    offsetMs: z.number().int().min(0).max(60_000),

    // Accelerometer values in g.
    ax: finiteNumber.min(-32).max(32),
    ay: finiteNumber.min(-32).max(32),
    az: finiteNumber.min(-32).max(32),

    // Gyroscope values in degrees per second.
    gx: finiteNumber.min(-4000).max(4000),
    gy: finiteNumber.min(-4000).max(4000),
    gz: finiteNumber.min(-4000).max(4000),
  })
  .strict();

const telemetryBatchSchema = z
  .object({
    sessionId: z.string().cuid("Session ID is invalid"),

    /*
     * Generate this once on ESP32 and persist it beside the batch.
     * Reuse exactly the same ID for every retry.
     */
    batchId: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(
        /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
        "Batch ID may contain only letters, numbers, underscores, and hyphens",
      ),

    samplingRateHz: z.number().int().min(20).max(200),

    startedAt: z.coerce
      .date()
      .refine(
        (value) => value.getTime() <= Date.now() + 5 * 60 * 1000,
        "startedAt cannot be more than five minutes in the future",
      ),

    /*
     * 200 samples at 50 Hz is four seconds of data and stays safely
     * beneath the existing 100 KB Express JSON body limit.
     */
    samples: z.array(sampleSchema).min(1).max(200),
  })
  .strict()
  .superRefine((data, context) => {
    for (let position = 0; position < data.samples.length; position += 1) {
      const sample = data.samples[position];

      if (sample.index !== position) {
        context.addIssue({
          code: "custom",
          path: ["samples", position, "index"],
          message: "Sample indexes must start at 0 and be consecutive",
        });
      }

      if (
        position > 0 &&
        sample.offsetMs <= data.samples[position - 1].offsetMs
      ) {
        context.addIssue({
          code: "custom",
          path: ["samples", position, "offsetMs"],
          message: "Sample offsets must increase within a batch",
        });
      }
    }
  });

export const validateTelemetryBatch = validate(telemetryBatchSchema);
