import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

const batchSelect = {
  raw_sensor_batch_id: true,
  device_id: true,
  session_id: true,
  client_batch_id: true,
  sampling_rate_hz: true,
  sample_count: true,
  started_at: true,
  received_at: true,
  content_hash: true,
};

export const telemetryRepository = {
  findByDeviceAndClientBatchId(deviceId, clientBatchId) {
    return prisma.rawSensorBatch.findUnique({
      where: {
        device_id_client_batch_id: {
          device_id: deviceId,
          client_batch_id: clientBatchId,
        },
      },
      select: batchSelect,
    });
  },

  async createBatchWithSamples({ deviceId, data, contentHash }) {
    return prisma.$transaction(async (tx) => {
      /*
       * This update locks the Session row while the batch is saved.
       * Session completion also updates the same row, so it cannot race
       * with an in-progress upload.
       */
      const activeSession = await tx.session.updateMany({
        where: {
          session_id: data.sessionId,
          device_id: deviceId,
          status: {
            in: ["ACTIVE", "FINISHING"],
          },
        },
        data: {
          telemetry_revision: {
            increment: 1,
          },
        },
      });

      if (activeSession.count !== 1) {
        throw new AppError(
          "Session is not active or is not assigned to this device",
          409,
        );
      }

      const batch = await tx.rawSensorBatch.create({
        data: {
          device_id: deviceId,
          session_id: data.sessionId,
          client_batch_id: data.batchId,
          sampling_rate_hz: data.samplingRateHz,
          sample_count: data.samples.length,
          started_at: data.startedAt,
          content_hash: contentHash,
        },
        select: batchSelect,
      });

      await tx.rawSensorSample.createMany({
        data: data.samples.map((sample) => ({
          batch_id: batch.raw_sensor_batch_id,
          sample_index: sample.index,
          offset_ms: sample.offsetMs,
          ax: sample.ax,
          ay: sample.ay,
          az: sample.az,
          gx: sample.gx,
          gy: sample.gy,
          gz: sample.gz,
        })),
      });

      await tx.device.update({
        where: { device_id: deviceId },
        data: {
          last_synced_at: new Date(),
          last_seen_at: new Date(),
        },
      });

      return batch;
    });
  },
};
