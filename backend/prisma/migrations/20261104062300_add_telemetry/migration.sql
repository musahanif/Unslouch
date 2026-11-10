-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "telemetry_revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RawSensorBatch" (
    "raw_sensor_batch_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "client_batch_id" TEXT NOT NULL,
    "sampling_rate_hz" INTEGER NOT NULL,
    "sample_count" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content_hash" TEXT NOT NULL,

    CONSTRAINT "RawSensorBatch_pkey" PRIMARY KEY ("raw_sensor_batch_id")
);

-- CreateTable
CREATE TABLE "RawSensorSample" (
    "raw_sensor_sample_id" BIGSERIAL NOT NULL,
    "batch_id" TEXT NOT NULL,
    "sample_index" INTEGER NOT NULL,
    "offset_ms" INTEGER NOT NULL,
    "ax" DOUBLE PRECISION NOT NULL,
    "ay" DOUBLE PRECISION NOT NULL,
    "az" DOUBLE PRECISION NOT NULL,
    "gx" DOUBLE PRECISION NOT NULL,
    "gy" DOUBLE PRECISION NOT NULL,
    "gz" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RawSensorSample_pkey" PRIMARY KEY ("raw_sensor_sample_id")
);

-- CreateIndex
CREATE INDEX "RawSensorBatch_session_id_started_at_idx" ON "RawSensorBatch"("session_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "RawSensorBatch_device_id_client_batch_id_key" ON "RawSensorBatch"("device_id", "client_batch_id");

-- CreateIndex
CREATE INDEX "RawSensorSample_batch_id_idx" ON "RawSensorSample"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "RawSensorSample_batch_id_sample_index_key" ON "RawSensorSample"("batch_id", "sample_index");

-- AddForeignKey
ALTER TABLE "RawSensorBatch" ADD CONSTRAINT "RawSensorBatch_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("device_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSensorBatch" ADD CONSTRAINT "RawSensorBatch_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSensorSample" ADD CONSTRAINT "RawSensorSample_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "RawSensorBatch"("raw_sensor_batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
