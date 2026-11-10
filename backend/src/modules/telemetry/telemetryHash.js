import { createHash } from "node:crypto";

export const createTelemetryContentHash = (data) => {
  const normalized = {
    sessionId: data.sessionId,
    batchId: data.batchId,
    samplingRateHz: data.samplingRateHz,
    startedAt: data.startedAt.toISOString(),
    samples: data.samples.map((sample) => ({
      index: sample.index,
      offsetMs: sample.offsetMs,
      ax: sample.ax,
      ay: sample.ay,
      az: sample.az,
      gx: sample.gx,
      gy: sample.gy,
      gz: sample.gz,
    })),
  };

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
};