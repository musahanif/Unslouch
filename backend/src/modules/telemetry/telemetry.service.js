import { AppError } from "../../utils/AppError.js";
import { createTelemetryContentHash } from "./telemetryHash.js";
import { telemetryRepository } from "./telemetry.repository.js";

export const telemetryService = {
  async uploadBatch(deviceId, data) {
    const contentHash = createTelemetryContentHash(data);

    /*
     * Check for an existing batch first. This permits a device to retry
     * after losing the server response, even if the session is now closed.
     */
    const existing =
      await telemetryRepository.findByDeviceAndClientBatchId(
        deviceId,
        data.batchId,
      );

    if (existing) {
      if (existing.content_hash !== contentHash) {
        throw new AppError(
          "Batch ID was already used with different telemetry contents",
          409,
        );
      }

      return {
        batch: existing,
        alreadyAccepted: true,
      };
    }

    try {
      const batch = await telemetryRepository.createBatchWithSamples({
        deviceId,
        data,
        contentHash,
      });

      return {
        batch,
        alreadyAccepted: false,
      };
    } catch (error) {
      /*
       * Handles two identical requests arriving concurrently. One creates
       * the batch; the other sees the database unique constraint, reloads
       * it, and returns an idempotent success response.
       */
      if (error?.code === "P2002") {
        const concurrentBatch =
          await telemetryRepository.findByDeviceAndClientBatchId(
            deviceId,
            data.batchId,
          );

        if (concurrentBatch) {
          if (concurrentBatch.content_hash !== contentHash) {
            throw new AppError(
              "Batch ID was already used with different telemetry contents",
              409,
            );
          }

          return {
            batch: concurrentBatch,
            alreadyAccepted: true,
          };
        }
      }

      throw error;
    }
  },
};