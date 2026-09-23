/**
 * Platform admin authorization via Better Auth `admin()` plugin.
 *
 * Requires migrated Postgres — see auth-integration.test.ts.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { PLATFORM_ADMIN_ROLE } from "@bondery/helpers/auth/platform-admin";
import { generateId } from "@bondery/helpers/ids";
import type { FastifyInstance } from "fastify";
import { isPlatformAdmin } from "../lib/auth/is-platform-admin.js";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");

async function createTestUser(role: string = "user"): Promise<{ id: string; email: string }> {
  const id = generateId();
  const email = `platform-admin-${id}@example.test`;
  await prisma.user.create({
    data: { email, emailVerified: true, id, name: "Platform Admin Test", role },
  });
  await provisionNewUser({ name: "Platform Admin Test", userId: id });
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

describe("platform admin", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
  });

  it("isPlatformAdmin is true for role=admin and false for role=user", async () => {
    const admin = await createTestUser(PLATFORM_ADMIN_ROLE);
    const user = await createTestUser("user");

    assert.equal(await isPlatformAdmin(admin.id), true);
    assert.equal(await isPlatformAdmin(user.id), false);
  });

  it("blocks impersonate-user without impersonate permission", async () => {
    const admin = await createTestUser(PLATFORM_ADMIN_ROLE);
    const target = await createTestUser("user");
    const token = await createNativeSession(admin.id);

    const response = await app.inject({
      body: JSON.stringify({ userId: target.id }),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method: "POST",
      url: "/auth/admin/impersonate-user",
    });

    assert.equal(response.statusCode, 403, response.body);
  });
});
