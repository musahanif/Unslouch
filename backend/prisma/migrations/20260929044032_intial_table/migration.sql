-- CreateEnum
CREATE TYPE "SCOLIOSIS_TYPE" AS ENUM ('THORACIC', 'LUMBAR', 'S_CURVE');

-- CreateEnum
CREATE TYPE "Session_Status" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "Detected_activity" AS ENUM ('SITTING', 'STANDING', 'WALKING', 'BENDING');

-- CreateEnum
CREATE TYPE "Difficulty_Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateTable
CREATE TABLE "Calibration" (
    "calibration_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "baseline_pitch" DOUBLE PRECISION,
    "baseline_roll" DOUBLE PRECISION,
    "baseline_yaw" DOUBLE PRECISION,
    "is_active" BOOLEAN,
    "calibrated_at" TIMESTAMP(3),

    CONSTRAINT "Calibration_pkey" PRIMARY KEY ("calibration_id")
);

-- CreateTable
CREATE TABLE "Device" (
    "device_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "mac_address" TEXT,
    "device_model" TEXT,
    "battery_level" INTEGER,
    "last_synced_at" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("device_id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "exercise_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_area" TEXT,
    "difficulty_level" "Difficulty_Level",
    "duration_sec" INTEGER,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("exercise_id")
);

-- CreateTable
CREATE TABLE "Exercise_Log" (
    "log_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "duration_performed_sec" INTEGER,
    "is_completed" BOOLEAN,

    CONSTRAINT "Exercise_Log_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "Exercise_Recomendation" (
    "recommendation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "reason_pattern" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercise_Recomendation_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "alert_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3),
    "trigger_reason" TEXT,
    "slouch_duration_sec" INTEGER,
    "dismissed_or_corrected" BOOLEAN,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "Session" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "total_good_posture_sec" INTEGER,
    "total_slouch_sec" INTEGER,
    "status" "Session_Status",

    CONSTRAINT "Session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "Posture_telemetry_logs" (
    "log_id" BIGSERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3),
    "detected_activity" "Detected_activity",
    "angular_deviation_pitch" DOUBLE PRECISION,
    "angular_deviation_roll" DOUBLE PRECISION,
    "is_unfavorable" BOOLEAN,

    CONSTRAINT "Posture_telemetry_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "scoliosis_type" "SCOLIOSIS_TYPE",
    "target_daily_exercise_min" INTEGER,
    "posture_alert_threshold_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_mac_address_key" ON "Device"("mac_address");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("device_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calibration" ADD CONSTRAINT "Calibration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise_Log" ADD CONSTRAINT "Exercise_Log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise_Log" ADD CONSTRAINT "Exercise_Log_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise_Log" ADD CONSTRAINT "Exercise_Log_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "Exercise_Recomendation"("recommendation_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise_Recomendation" ADD CONSTRAINT "Exercise_Recomendation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise_Recomendation" ADD CONSTRAINT "Exercise_Recomendation_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "Exercise"("exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise_Recomendation" ADD CONSTRAINT "Exercise_Recomendation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("device_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Posture_telemetry_logs" ADD CONSTRAINT "Posture_telemetry_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;
