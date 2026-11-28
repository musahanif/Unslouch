// tests/integration/01-auth.test.js
// ─────────────────────────────────────────────────────────────────────────────
// TC-01 to TC-08  — Register & Login
// Covers worksheet operations: Register (TC-01, TC-02) and Login (TC-03–TC-08).
// ─────────────────────────────────────────────────────────────────────────────
import supertest from "supertest";
import app from "../../src/app.js";
import {
  db,
  disconnectDB,
  clearDatabase,
  TRUSTED_ORIGIN,
} from "../helpers/setup.js";

const request = supertest(app);

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Prevent real SMTP calls during tests.
jest.mock("../../src/utils/mailService.js", () => ({
  sendEmailVerificationOtp: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetLink: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(async () => clearDatabase());
afterAll(async () => disconnectDB());

// =============================================================================
//  REGISTER
// =============================================================================
describe("TC-01 | Register — Positive: valid registration", () => {
  test("returns 201 and a user object without sensitive fields", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        name: "Josh Jovancio",
        email: "josh@test.com",
        password: "password123",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      email: "josh@test.com",
      name: "Josh Jovancio",
    });
    // Password must NEVER be returned
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.verificationRequired).toBe(true);
  });
});

describe("TC-02 | Register — Negative: duplicate email", () => {
  test("returns 409 when the email is already registered", async () => {
    await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ name: "First", email: "dup@test.com", password: "password123" });

    const res = await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ name: "Second", email: "dup@test.com", password: "password456" });

    expect(res.status).toBe(409);
  });
});

describe("TC-25 | Register — Negative: password too short", () => {
  test("returns 400 when password is fewer than 8 characters", async () => {
    const res = await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ name: "Josh", email: "new@test.com", password: "short" });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
//  LOGIN
// =============================================================================
describe("TC-03 | Login — Positive: correct verified credentials", () => {
  test("returns 200, sets an HTTP-only auth cookie, and returns user data", async () => {
    // Setup: register then verify email directly in DB
    await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ name: "Josh", email: "josh@test.com", password: "password123" });
    await db.user.update({
      where: { email: "josh@test.com" },
      data: { email_verified_at: new Date() },
    });

    const res = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: "josh@test.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.data.user.email).toBe("josh@test.com");
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe("TC-04 | Login — Negative: wrong password", () => {
  test("returns 401 with a generic error message (no account enumeration)", async () => {
    const res = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: "nobody@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
  });
});

describe("TC-05 | Login — Negative: unverified account", () => {
  test("returns 403 prompting email verification", async () => {
    await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({
        name: "Unverified",
        email: "unverified@test.com",
        password: "password123",
      });

    const res = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: "unverified@test.com", password: "password123" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verify/i);
  });
});

describe("TC-06 | Login — Negative: empty request body", () => {
  test("returns 400 when both email and password are missing", async () => {
    const res = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("TC-26 | Login — Negative: invalid email format", () => {
  test("returns 400 when the email field is not a valid email address", async () => {
    const res = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
  });
});

// =============================================================================
//  CURRENT USER  (GET /me)
// =============================================================================
describe("GET /api/auth/me — Positive: authenticated user", () => {
  test("returns the user profile without sensitive fields", async () => {
    await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ name: "Josh", email: "josh@test.com", password: "password123" });
    await db.user.update({
      where: { email: "josh@test.com" },
      data: { email_verified_at: new Date() },
    });

    const login = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: "josh@test.com", password: "password123" });
    const cookie = login.headers["set-cookie"];

    const res = await request.get("/api/auth/me").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe("josh@test.com");
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe("GET /api/auth/me — Negative: no cookie", () => {
  test("returns 401 when no authentication cookie is provided", async () => {
    const res = await request.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/auth/me — Negative: tampered cookie", () => {
  test("returns 401 when the token is invalid", async () => {
    const res = await request
      .get("/api/auth/me")
      .set("Cookie", "unslouch_token=totally.invalid.token");
    expect(res.status).toBe(401);
  });
});

// =============================================================================
//  LOGOUT
// =============================================================================
describe("Logout — Positive: authenticated user", () => {
  test("returns 200 and clears the auth cookie", async () => {
    await request
      .post("/api/auth/register")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ name: "Josh", email: "josh@test.com", password: "password123" });
    await db.user.update({
      where: { email: "josh@test.com" },
      data: { email_verified_at: new Date() },
    });
    const login = await request
      .post("/api/auth/login")
      .set("Origin", TRUSTED_ORIGIN)
      .send({ email: "josh@test.com", password: "password123" });
    const cookie = login.headers["set-cookie"];

    const res = await request
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .set("Origin", TRUSTED_ORIGIN);

    expect(res.status).toBe(200);
  });
});

describe("Logout — Negative: no cookie", () => {
  test("returns 401 when no cookie is provided", async () => {
    const res = await request
      .post("/api/auth/logout")
      .set("Origin", TRUSTED_ORIGIN);
    expect(res.status).toBe(401);
  });
});
