/**
 * CardDAV device keys and REST API keys share the `apikey` table under two Better Auth
 * configurations. Neither kind may work, show up, count, or change on the other side.
 *
 * Needs a migrated Postgres.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { API_KEY_LIMITS, CARDDAV_KEY_PREFIX } from "@bondery/schemas";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

type Helpers = typeof import("./dav-test-helpers.js");

describe("key isolation between REST and CardDAV", () => {
  let app: FastifyInstance;
  let helpers: Helpers;
  let services: typeof import("../services/me/api-keys.js");
  let auth: typeof import("../lib/auth/index.js").auth;
  const userIds: string[] = [];

  before(async () => {
    helpers = await import("./dav-test-helpers.js");
    services = await import("../services/me/api-keys.js");
    ({ auth } = await import("../lib/auth/index.js"));
    const { createTestApp } = await import("./create-test-app.js");
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  async function newUser() {
    const user = await helpers.createTestUser("isolation");
    userIds.push(user.id);
    return user;
  }

  it("mints DAV keys with the DAV prefix and REST keys without it", async () => {
    const user = await newUser();
    const dav = await helpers.createDavDevice(user.id);
    const rest = await helpers.createRestKey(user.id);
    assert.ok(dav.key.startsWith(CARDDAV_KEY_PREFIX));
    assert.equal(rest.key.startsWith(CARDDAV_KEY_PREFIX), false);

    const stored = await prisma.apikey.findUniqueOrThrow({ where: { id: dav.keyId } });
    assert.equal(stored.configId, "carddav");
    assert.equal(stored.start?.length, 16);
  });

  it("rejects a DAV key as a REST Bearer token", async () => {
    const user = await newUser();
    const { key } = await helpers.createDavDevice(user.id);
    const response = await app.inject({
      headers: { authorization: `Bearer ${key}` },
      method: "GET",
      url: "/contacts",
    });
    assert.equal(response.statusCode, 401);
  });

  it("verifies a key only under its own configuration", async () => {
    const user = await newUser();
    const dav = await helpers.createDavDevice(user.id);
    const rest = await helpers.createRestKey(user.id);

    const davAsRest = await auth.api.verifyApiKey({ body: { configId: "default", key: dav.key } });
    const restAsDav = await auth.api.verifyApiKey({ body: { configId: "carddav", key: rest.key } });
    const davAsDav = await auth.api.verifyApiKey({ body: { configId: "carddav", key: dav.key } });
    const restAsRest = await auth.api.verifyApiKey({
      body: { configId: "default", key: rest.key },
    });

    assert.equal(davAsRest.valid, false);
    assert.equal(restAsDav.valid, false);
    assert.equal(davAsDav.valid, true);
    assert.equal(restAsRest.valid, true);
  });

  it("lists only REST keys", async () => {
    const user = await newUser();
    await helpers.createDavDevice(user.id);
    const rest = await helpers.createRestKey(user.id);

    const { apiKeys, totalCount } = await services.listApiKeys(user.id);
    assert.equal(totalCount, 1);
    assert.deepEqual(
      apiKeys.map((row) => row.id),
      [rest.keyId],
    );
  });

  it("counts only REST keys against the REST key cap", async () => {
    const user = await newUser();
    for (let index = 0; index < API_KEY_LIMITS.maxPerUser; index += 1) {
      await helpers.createDavDevice(user.id, `phone-${index}`);
    }

    const created = await services.createApiKey(
      { user: { email: user.email, id: user.id } },
      { label: "first REST key", permission: "read" },
    );
    assert.ok(created.secret.length > 0);
    assert.equal(created.secret.startsWith(CARDDAV_KEY_PREFIX), false);

    const stored = await prisma.apikey.findUniqueOrThrow({ where: { id: created.id } });
    assert.equal(stored.configId, "default");
  });

  it("answers 404 when a REST call deletes or renames a DAV key", async () => {
    const user = await newUser();
    const dav = await helpers.createDavDevice(user.id);
    const context = { user: { email: user.email, id: user.id } };

    await assert.rejects(
      () => services.deleteApiKey(context, dav.keyId),
      (error: Error & { statusCode?: number; code?: string }) =>
        error.statusCode === 404 && error.code === "api_key_not_found",
    );
    await assert.rejects(
      () => services.updateApiKeyLabel(context, dav.keyId, "renamed"),
      (error: Error & { statusCode?: number }) => error.statusCode === 404,
    );

    const stillThere = await prisma.apikey.findUnique({ where: { id: dav.keyId } });
    assert.equal(stillThere?.name, "Test phone");
  });

  it("deletes the device row when its key is deleted", async () => {
    const user = await newUser();
    const dav = await helpers.createDavDevice(user.id);
    await prisma.apikey.delete({ where: { id: dav.keyId } });
    assert.equal(await prisma.carddavDevice.count({ where: { id: dav.deviceId } }), 0);
  });
});
