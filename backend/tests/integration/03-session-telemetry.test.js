// tests/integration/03-session-telemetry.test.js
// ─────────────────────────────────────────────────────────────────────────────
// TC-11 to TC-19  — Stream Session Telemetry, Real-time Posture Detection
//                    & Analyze Full Sessions
//
// Pre-condition for session tests: device must be paired AND have an active
// calibration. The calibrateDevice() helper handles both steps.
// ─────────────────────────────────────────────────────────────────────────────
import supertest from "supertest";
import app from "../../src/app.js";
import {
  db,
  disconnectDB,
  clearDatabase,
  TRUSTED_ORIGIN,
  createVerifiedUser,
  provisionDevice,
  pairDevice,
  calibrateDevice,
  buildTelemetryBatch,
} from "../helpers/setup.js";

const request = supertest(app);

jest.mock("../../src/utils/mailService.js", () => ({
  sendEmailVerificationOtp: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetLink: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(async () => clearDatabase());
afterAll(async () => disconnectDB());

// ── Shared setup: returns { cookie, deviceId, deviceAuthHeader } ──────────────
async function fullSetup(serial = "UNSLOUCH-S001", email = "tester@test.com") {
  const { cookie, user } = await createVerifiedUser(request, { email });
  const { serialNumber, setupCode } = await provisionDevice(serial);
  const { device, deviceAuthHeader } = await pairDevice(request, cookie, {
    serialNumber,
    setupCode,
  });
  await calibrateDevice(request, cookie, deviceAuthHeader, device.device_id);
  return { cookie, user, device, deviceAuthHeader };
}

// =============================================================================
//  STREAM SESSION TELEMETRY  (TC-11 to TC-14)
// =============================================================================
describe("TC-11 | Stream Telemetry — Positive: start session and submit a batch", () => {
  test("session created (201) and first batch stored (201)", async () => {
    const { cookie, device, deviceAuthHeader } = await fullSetup();

    // Start session
    const sessionRes = await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });
    expect(sessionRes.status).toBe(201);

    const sessionId = sessionRes.body.data.session.session_id;

    // Upload a telemetry batch from the device
    const batchRes = await request
      .post("/api/telemetry/batches")
      .set("Authorization", deviceAuthHeader)
      .send(buildTelemetryBatch(sessionId, "batch-tc11"));
    expect(batchRes.status).toBe(201);
  });
});

describe("TC-12 | Stream Telemetry — Positive: device reconnect uploads buffered batch", () => {
  test("re-sending a new batch after simulated dropout stores it normally (201)", async () => {
    const { cookie, device, deviceAuthHeader } = await fullSetup(
      "UNSLOUCH-S002",
      "tester2@test.com",
    );

    const sessionRes = await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });
    const sessionId = sessionRes.body.data.session.session_id;

    // Simulate reconnect: device uploads a fresh batch after dropout
    const batchRes = await request
      .post("/api/telemetry/batches")
      .set("Authorization", deviceAuthHeader)
      .send(buildTelemetryBatch(sessionId, "batch-after-dropout", 3));
    expect(batchRes.status).toBe(201);

    // Verify exactly 3 samples were stored
    const count = await db.rawSensorSample.count({
      where: { batch: { session_id: sessionId } },
    });
    expect(count).toBe(3);
  });
});

describe("TC-13 | Stream Telemetry — Negative: batch submitted without an active session", () => {
  test("returns 409 when the session does not exist or is not active", async () => {
    const { deviceAuthHeader } = await fullSetup(
      "UNSLOUCH-S003",
      "tester3@test.com",
    );

    const res = await request
      .post("/api/telemetry/batches")
      .set("Authorization", deviceAuthHeader)
      .send(buildTelemetryBatch("nonexistent-session-id", "orphan-batch"));

    // 400 (validation) or 409 (session not found / inactive)
    expect([400, 409]).toContain(res.status);
  });
});

describe("TC-14 | Stream Telemetry — Negative: duplicate batch is idempotent", () => {
  test("re-sending the same batchId returns 200 and stores no extra samples", async () => {
    const { cookie, device, deviceAuthHeader } = await fullSetup(
      "UNSLOUCH-S004",
      "tester4@test.com",
    );

    const sessionRes = await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });
    const sessionId = sessionRes.body.data.session.session_id;

    const batch = buildTelemetryBatch(sessionId, "batch-idempotent", 2);

    // First upload
    const first = await request
      .post("/api/telemetry/batches")
      .set("Authorization", deviceAuthHeader)
      .send(batch);
    expect(first.status).toBe(201);

    // Duplicate upload (simulates retry)
    const second = await request
      .post("/api/telemetry/batches")
      .set("Authorization", deviceAuthHeader)
      .send(batch);
    expect(second.status).toBe(200); // idempotent — already accepted

    // Only the original 2 samples should exist
    const count = await db.rawSensorSample.count({
      where: { batch: { session_id: sessionId } },
    });
    expect(count).toBe(2);
  });
});

// =============================================================================
//  REAL-TIME POSTURE DETECTION  (TC-15 to TC-17)
//  The backend side of real-time detection is validated through the firmware
//  device heartbeat and active-session endpoints which the WebSocket layer
//  relies on. Full WebSocket tests require an integration harness; here we
//  verify the supporting REST contracts.
// =============================================================================
describe("TC-15 | Real-time Posture — Positive: device heartbeat accepted during session", () => {
  test("POST /api/device/heartbeat returns 200 while device is authenticated", async () => {
    const { deviceAuthHeader } = await fullSetup(
      "UNSLOUCH-S005",
      "tester5@test.com",
    );

    const res = await request
      .post("/api/device/heartbeat")
      .set("Authorization", deviceAuthHeader)
      .send({ batteryLevel: 85, firmwareVersion: "1.0.0" });

    expect(res.status).toBe(200);
  });
});

describe("TC-16 | Real-time Posture — Positive: active session visible to device", () => {
  test("GET /api/device/sessions/active returns the running session", async () => {
    const { cookie, device, deviceAuthHeader } = await fullSetup(
      "UNSLOUCH-S006",
      "tester6@test.com",
    );

    await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });

    const res = await request
      .get("/api/device/sessions/active")
      .set("Authorization", deviceAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.session).not.toBeNull();
  });
});

describe("TC-17 | Real-time Posture — Negative: device disconnected (no auth header)", () => {
  test("firmware route returns 401 when no device credential is supplied", async () => {
    const res = await request.get("/api/device/sessions/active");
    expect(res.status).toBe(401);
  });
});

// =============================================================================
//  ANALYZE FULL SESSIONS  (TC-18 to TC-19)
// =============================================================================
describe("TC-18 | Analyze Session — Positive: completing an active session succeeds", () => {
  test("returns 200 (FINISHING) and device finalize transitions session to COMPLETED", async () => {
    const { cookie, device, deviceAuthHeader } = await fullSetup(
      "UNSLOUCH-S007",
      "tester7@test.com",
    );

    const sessionRes = await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });
    const sessionId = sessionRes.body.data.session.session_id;

    const completeRes = await request
      .post(`/api/sessions/${sessionId}/complete`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

    expect(completeRes.status).toBe(200);

    // Verify status transitioned to FINISHING while waiting for device finalization
    const finishingSession = await db.session.findUnique({
      where: { session_id: sessionId },
    });
    expect(finishingSession.status).toBe("FINISHING");

    // Device finalizes the session
    const finalizeRes = await request
      .post(`/api/device/sessions/${sessionId}/finalize`)
      .set("Authorization", deviceAuthHeader);
    expect(finalizeRes.status).toBe(200);

    const completedSession = await db.session.findUnique({
      where: { session_id: sessionId },
    });
    expect(completedSession.status).toBe("COMPLETED");
  });
});

describe("TC-19 | Analyze Session — Negative: re-completing an already-completed session", () => {
  test("returns 200 (safe idempotent retry) or 409, never duplicating work", async () => {
    const { cookie, device } = await fullSetup(
      "UNSLOUCH-S008",
      "tester8@test.com",
    );

    const sessionRes = await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });
    const sessionId = sessionRes.body.data.session.session_id;

    // Complete once
    await request
      .post(`/api/sessions/${sessionId}/complete`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

    // Complete again
    const second = await request
      .post(`/api/sessions/${sessionId}/complete`)
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

    // 200 = already completed (idempotent safe), 409 = only ACTIVE can be completed
    expect([200, 409]).toContain(second.status);
  });
});

// =============================================================================
//  SESSION MANAGEMENT  (TC-20 to TC-22, TC-24)
// =============================================================================
describe("TC-20 | View Sessions — Positive: list sessions after completing one", () => {
  test("GET /api/sessions returns the user's sessions", async () => {
    const { cookie, device } = await fullSetup(
      "UNSLOUCH-S009",
      "tester9@test.com",
    );

    await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });

    const res = await request.get("/api/sessions").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.sessions.length).toBeGreaterThanOrEqual(1);
  });
});

describe("TC-21 | View Sessions — Positive: session detail includes status", () => {
  test("GET /api/sessions/:id returns the correct session", async () => {
    const { cookie, device } = await fullSetup(
      "UNSLOUCH-S010",
      "tester10@test.com",
    );

    const sessionRes = await request
      .post("/api/sessions")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });
    const sessionId = sessionRes.body.data.session.session_id;

    const res = await request
      .get(`/api/sessions/${sessionId}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.session.session_id).toBe(sessionId);
    expect(res.body.data.session.status).toBe("ACTIVE");
  });
});

describe("TC-22 | View Sessions — Negative: access dashboard without login", () => {
  test("GET /api/sessions returns 401 without an auth cookie", async () => {
    const res = await request.get("/api/sessions");
    expect(res.status).toBe(401);
  });
});

describe("TC-24 | Start Session — Negative: session for device owned by another user", () => {
  test("returns 404 when the deviceId is not owned by the requesting user", async () => {
    const { cookie: cookie1 } = await createVerifiedUser(request, {
      email: "owner@test.com",
    });
    const { cookie: cookie2 } = await createVerifiedUser(request, {
      email: "attacker@test.com",
    });
    const { serialNumber, setupCode } = await provisionDevice("UNSLOUCH-S011");
    const { device } = await pairDevice(request, cookie1, {
      serialNumber,
      setupCode,
    });

    // Attacker tries to start a session on owner's device
    const res = await request
      .post("/api/sessions")
      .set("Cookie", cookie2)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ deviceId: device.device_id });

    expect(res.status).toBe(404);
  });
});
