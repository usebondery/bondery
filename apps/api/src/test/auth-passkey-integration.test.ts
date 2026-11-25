/**
 * Real-Postgres passkey registration-options gate.
 *
 * Shares the `test:auth` harness (live Postgres + Fastify inject). See
 * `auth-integration.test.ts` for the suite's env/migration requirements.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { resolveWebAuthnRp } from "@bondery/helpers/auth/resolve-webauthn-rp";
import { generateId } from "@bondery/helpers/ids";
import { PASSKEY_LIMITS } from "@bondery/schemas";
import type { FastifyInstance } from "fastify";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");

const WEBAPP_URL = (process.env["BONDERY_PUBLIC_WEBAPP_URL"] ?? "").replace(/\/+$/u, "");
const GENERATE_REGISTER_OPTIONS_PATH = "/auth/passkey/generate-register-options";

async function createTestUser(): Promise<{ id: string; email: string }> {
  const id = generateId();
  const email = `auth-passkey-${id}@example.test`;
  await prisma.user.create({
    data: { email, emailVerified: true, id, name: "Auth Passkey Test User" },
  });
  await provisionNewUser({ name: "Auth Passkey Test User", userId: id });
  return { email, id };
}

async function createNativeSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      token,
      userId,
    },
  });
  return token;
}

function extractWebAuthnUser(body: unknown): { displayName?: string; name?: string } | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const nested =
    record.publicKey && typeof record.publicKey === "object"
      ? (record.publicKey as Record<string, unknown>)
      : record;
  const { user } = nested;
  if (!user || typeof user !== "object") {
    return null;
  }

  return user as { displayName?: string; name?: string };
}

function extractWebAuthnRp(body: unknown): { id?: string; name?: string } | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const nested =
    record.publicKey && typeof record.publicKey === "object"
      ? (record.publicKey as Record<string, unknown>)
      : record;
  const { rp } = nested;
  if (!rp || typeof rp !== "object") {
    return null;
  }

  return rp as { id?: string; name?: string };
}

function extractErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.code === "string") {
    return record.code;
  }

  const { error } = record;
  if (
    error &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

async function seedPasskeys(userId: string, count: number): Promise<void> {
  await prisma.passkey.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      backedUp: false,
      counter: 0,
      credentialID: `test-cred-${userId}-${index}`,
      deviceType: "singleDevice",
      id: generateId(),
      publicKey: `test-public-key-${index}`,
      userId,
    })),
  });
}

describe("passkey generate-register-options", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];

  before(async () => {
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("rejects unauthenticated registration options with 401", async () => {
    const response = await app.inject({
      headers: { origin: WEBAPP_URL },
      method: "GET",
      url: GENERATE_REGISTER_OPTIONS_PATH,
    });
    assert.equal(response.statusCode, 401);
  });

  it("returns configured rpID and rpName when a session is present", async () => {
    const resolved = resolveWebAuthnRp({
      rpIdOverride: process.env["BONDERY_PUBLIC_WEBAUTHN_RP_ID"],
      webappUrl: WEBAPP_URL,
    });
    const expectedRpID = resolved.ok ? resolved.rpID : "localhost";

    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
        origin: resolved.ok ? resolved.origin : "http://localhost",
      },
      method: "GET",
      url: GENERATE_REGISTER_OPTIONS_PATH,
    });

    assert.equal(response.statusCode, 200);
    const rp = extractWebAuthnRp(response.json());
    assert.ok(rp, `expected rp in generate-register-options body, got: ${response.body}`);
    assert.equal(rp.id, expectedRpID);
    assert.equal(rp.name, "Bondery");
  });

  it("ignores query name so WebAuthn user.name stays the session email", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
        origin: WEBAPP_URL || "http://localhost",
      },
      method: "GET",
      url: `${GENERATE_REGISTER_OPTIONS_PATH}?name=Chrome%20on%20Windows`,
    });

    assert.equal(response.statusCode, 200);
    const webAuthnUser = extractWebAuthnUser(response.json());
    assert.ok(
      webAuthnUser,
      `expected user in generate-register-options body, got: ${response.body}`,
    );
    assert.equal(webAuthnUser.name, user.email);
  });

  it("returns 200 when the account is under the passkey cap", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    await seedPasskeys(user.id, PASSKEY_LIMITS.maxPerUser - 1);
    const sessionToken = await createNativeSession(user.id);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
        origin: WEBAPP_URL || "http://localhost",
      },
      method: "GET",
      url: GENERATE_REGISTER_OPTIONS_PATH,
    });

    assert.equal(response.statusCode, 200);
  });

  it("returns 409 PASSKEY_LIMIT_REACHED at the passkey cap", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    await seedPasskeys(user.id, PASSKEY_LIMITS.maxPerUser);
    const sessionToken = await createNativeSession(user.id);

    const response = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
        origin: WEBAPP_URL || "http://localhost",
      },
      method: "GET",
      url: GENERATE_REGISTER_OPTIONS_PATH,
    });

    assert.equal(response.statusCode, 409);
    assert.equal(extractErrorCode(response.json()), "PASSKEY_LIMIT_REACHED");
  });
});
