// tests/integration/02-device.test.js
// ─────────────────────────────────────────────────────────────────────────────
// TC-07 to TC-10  — Connect Device (Wi-Fi / BLE pairing)
// Tests the full device pairing flow: provision in DB → pair via API →
// verify auth header works for firmware routes.
// ─────────────────────────────────────────────────────────────────────────────
import supertest from "supertest";
import app from "../../src/app.js";
import {
  disconnectDB,
  clearDatabase,
  TRUSTED_ORIGIN,
  createVerifiedUser,
  provisionDevice,
  pairDevice,
} from "../helpers/setup.js";

const request = supertest(app);

jest.mock("../../src/utils/mailService.js", () => ({
  sendEmailVerificationOtp: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetLink: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(async () => clearDatabase());
afterAll(async () => disconnectDB());

// =============================================================================
//  CONNECT DEVICE (TC-07 to TC-10)
// =============================================================================
describe("TC-07 | Connect Device — Positive: QR / serial pairing succeeds", () => {
  test("returns 201 with device details and a one-time credential secret", async () => {
    const { cookie } = await createVerifiedUser(request);
    const { serialNumber, setupCode } = await provisionDevice("UNSLOUCH-A001");

    const res = await request
      .post("/api/devices/pair")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ serialNumber, setupCode });

    expect(res.status).toBe(201);
    expect(res.body.data.device).toBeDefined();
    expect(res.body.data.credential.authorization).toMatch(/^Device /);
  });
});

describe("TC-08 | Connect Device — Positive: paired device can authenticate (simulate reconnect)", () => {
  test("device credential header grants access to firmware route GET /api/device/me", async () => {
    const { cookie } = await createVerifiedUser(request);
    const { serialNumber, setupCode } = await provisionDevice("UNSLOUCH-B002");
    const { deviceAuthHeader } = await pairDevice(request, cookie, {
      serialNumber,
      setupCode,
    });

    const res = await request
      .get("/api/device/me")
      .set("Authorization", deviceAuthHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.device.serial_number).toBe("UNSLOUCH-B002");
  });
});

describe("TC-09 | Connect Device — Negative: device already paired to another user", () => {
  test("returns 401 when a second user tries to pair the same device (setup code cleared on claim)", async () => {
    const { cookie: cookie1 } = await createVerifiedUser(request, {
      email: "user1@test.com",
    });
    const { cookie: cookie2 } = await createVerifiedUser(request, {
      email: "user2@test.com",
    });
    const { serialNumber, setupCode } = await provisionDevice("UNSLOUCH-C003");

    // First user pairs successfully (clears setup_code_hash)
    await pairDevice(request, cookie1, { serialNumber, setupCode });

    // Second user tries to pair the same device
    const res = await request
      .post("/api/devices/pair")
      .set("Cookie", cookie2)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ serialNumber, setupCode });

    expect(res.status).toBe(401);
  });
});

describe("TC-10 | Connect Device — Negative: invalid setup code", () => {
  test("returns 401 when the setup code does not match", async () => {
    const { cookie } = await createVerifiedUser(request);
    const { serialNumber } = await provisionDevice("UNSLOUCH-D004");

    const res = await request
      .post("/api/devices/pair")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN)
      .send({ serialNumber, setupCode: "WrongCode999" });

    expect(res.status).toBe(401);
  });
});

describe("Connect Device — Negative: pairing without login", () => {
  test("returns 401 when no auth cookie is provided", async () => {
    const { serialNumber, setupCode } = await provisionDevice("UNSLOUCH-E005");

    const res = await request
      .post("/api/devices/pair")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ serialNumber, setupCode });

    expect(res.status).toBe(401);
  });
});

describe("Connect Device — List devices after pairing", () => {
  test("GET /api/devices returns only the devices owned by the authenticated user", async () => {
    const { cookie } = await createVerifiedUser(request);
    const { serialNumber, setupCode } = await provisionDevice("UNSLOUCH-F006");
    await pairDevice(request, cookie, { serialNumber, setupCode });

    const res = await request.get("/api/devices").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.devices.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.devices[0].serial_number).toBe("UNSLOUCH-F006");
  });
});
