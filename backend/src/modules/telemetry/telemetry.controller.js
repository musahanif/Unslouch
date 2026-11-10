import { sendSuccess } from "../../utils/apiResponse.js";
import { telemetryService } from "./telemetry.service.js";

export const uploadTelemetryBatch = async (req, res) => {
  const result = await telemetryService.uploadBatch(
    req.device.device_id,
    req.validatedBody,
  );

  return sendSuccess(res, {
    statusCode: result.alreadyAccepted ? 200 : 201,
    message: result.alreadyAccepted
      ? "Telemetry batch was already accepted"
      : "Telemetry batch stored successfully",
    data: {
      batch: result.batch,
      alreadyAccepted: result.alreadyAccepted,
    },
  });
};