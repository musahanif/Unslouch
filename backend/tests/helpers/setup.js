// tests/helpers/setup.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared test helpers: DB client, teardown, seed utilities, and request agent.
// ─────────────────────────────────────────────────────────────────────────────

// Reuse the same db singleton that the app uses (PrismaPg adapter + pool).
// This avoids creating a second incompatible PrismaClient and ensures
// all helpers write to the same test database the app reads from.
import { prisma as db, disconnectDB } from "../../src/config/db.js";
import { hashSetupCode } from "../../src/utils/deviceCredentials.js";

export { db, disconnectDB };

// ── Origin header required by CSRF middleware ─────────────────────────────────
// The app only allows mutations from trusted origins. In tests we set
// FRONTEND_URL=http://localhost:3000, so we always pass this header.
export const TRUSTED_ORIGIN = "http://localhost:3000";

// ── Teardown: wipe every table in dependency order ───────────────────────────
export async function clearDatabase() {
  // Delete in reverse-FK order so constraints are not violated.
  await db.rawSensorSample.deleteMany();
  await db.rawSensorBatch.deleteMany();
  await db.posture_telemetry_logs.deleteMany();
  await db.alert.deleteMany();
  await db.exercise_Log.deleteMany();
  await db.exercise_Recomendation.deleteMany();
  await db.session.deleteMany();
  await db.calibration.deleteMany();
  await db.calibrationCommand.deleteMany();
  await db.device.deleteMany();
  await db.emailVerificationOtp.deleteMany();
  await db.passwordResetToken.deleteMany();
  await db.user.deleteMany();
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Register + instantly verify a user and return { user, cookie }.
 * The cookie string can be passed directly to supertest's .set('Cookie').
 */
export async function createVerifiedUser(
  request,
  {
    name = "Test User",
    email = "tester@unslouch.test",
    password = "password123",
  } = {},
) {
  await request
    .post("/api/auth/register")
    .set("Origin", TRUSTED_ORIGIN)
    .send({ name, email, password });

  // Bypass email delivery by verifying directly in the DB.
  await db.user.update({
    where: { email },
    data: { email_verified_at: new Date() },
  });

  const res = await request
    .post("/api/auth/login")
    .set("Origin", TRUSTED_ORIGIN)
    .send({ email, password });

  const cookie = res.headers["set-cookie"];
  const user = res.body.data?.user;
  return { user, cookie };
}

// ── Device helpers ────────────────────────────────────────────────────────────

/**
 * Provision a raw device row in the DB (simulates factory provisioning).
 * Returns { device, setupCode, serialNumber }.
 */
export async function provisionDevice(serialNumber = "UNSLOUCH-TEST-001") {
  const setupCode = "TestSetup001"; // plain-text; hashed below
  const device = await db.device.create({
    data: {
      serial_number: serialNumber.toUpperCase(),
      is_active: true,
      setup_code_hash: hashSetupCode(setupCode),
    },
  });
  return { device, setupCode, serialNumber: device.serial_number };
}

/**
 * Pair a provisioned device to a user via the API.
 * Returns { device, deviceAuthHeader } where deviceAuthHeader is the
 * "Device <id>.<secret>" string used by firmware routes.
 */
export async function pairDevice(request, cookie, { serialNumber, setupCode }) {
  const res = await request
    .post("/api/devices/pair")
    .set("Cookie", cookie)
    .set("Origin", TRUSTED_ORIGIN)
    .send({ serialNumber, setupCode });

  if (res.status !== 201) {
    throw new Error(
      `pairDevice helper failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }

  const { device, credential } = res.body.data;
  return { device, deviceAuthHeader: credential.authorization };
}

/**
 * Request a calibration for a device (user side) and then submit the
 * calibration result (device/firmware side) so the device is ready for a session.
 */
export async function calibrateDevice(
  request,
  cookie,
  deviceAuthHeader,
  deviceId,
) {
  // 1. User requests a calibration
  const reqRes = await request
    .post(`/api/devices/${deviceId}/calibration-requests`)
    .set("Cookie", cookie)
    .set("Origin", TRUSTED_ORIGIN)
    .send({ sampleCount: 100, samplingRateHz: 50 });

  if (reqRes.status !== 201) {
    throw new Error(
      `requestCalibration failed: ${reqRes.status} ${JSON.stringify(reqRes.body)}`,
    );
  }

  // 2. Device fetches the pending calibration command
  const cmdRes = await request
    .get("/api/device/calibration-requests/next")
    .set("Authorization", deviceAuthHeader);

  const commandId = cmdRes.body.data?.command?.commandId;
  if (!commandId) {
    throw new Error(
      `No calibration command found for device: ${JSON.stringify(cmdRes.body)}`,
    );
  }

  // 3. Device submits the calibration result
  const subRes = await request
    .post("/api/device/calibrations")
    .set("Authorization", deviceAuthHeader)
    .send({
      commandId,
      baselinePitch: 0.5,
      baselineRoll: 0.3,
      sampleCount: 100,
      samplingRateHz: 50,
      pitchStdDev: 0.2,
      rollStdDev: 0.1,
      algorithmVersion: "v1.0",
      capturedAt: new Date().toISOString(),
    });

  if (subRes.status !== 201 && subRes.status !== 200) {
    throw new Error(
      `submitCalibration failed: ${subRes.status} ${JSON.stringify(subRes.body)}`,
    );
  }
}

/**
 * Build a minimal valid telemetry batch payload for a given sessionId.
 */
export function buildTelemetryBatch(
  sessionId,
  batchId = "batch-001",
  sampleCount = 1,
) {
  const samples = Array.from({ length: sampleCount }, (_, i) => ({
    index: i,
    offsetMs: i * 20,
    ax: 0.1,
    ay: 0.2,
    az: 9.8,
    gx: 0.5,
    gy: -0.3,
    gz: 0.1,
  }));

  return {
    sessionId,
    batchId,
    samplingRateHz: 50,
    startedAt: new Date().toISOString(),
    samples,
  };
}
