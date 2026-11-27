/**
 * The DAV verify cache: a verified key is remembered for 60 seconds, the device row stays the
 * revocation authority, and every revoke or rotate path forgets the entry.
 *
 * Needs a migrated Postgres. Redis is replaced by an in-memory fake.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const VERIFIED_PREFIX = "bondery:dav:verified:";
const VERIFIED_BY_ID_PREFIX = "bondery:dav:verified-by-id:";

type Helpers = typeof import("./dav-test-helpers.js");

describe("the DAV verify cache", () => {
  let app: FastifyInstance;
  let helpers: Helpers;
  let fakeRedis: ReturnType<Helpers["createFakeRedis"]>;
  let services: typeof import("../services/carddav/devices.js");
  let disconnectAll: typeof import("../services/carddav/disconnect-all.js");
  let setRedis: typeof import("../lib/platform/auth/dav-auth.js").setDavAuthRedisForTests;
  const userIds: string[] = [];

  before(async () => {
    process.env["BONDERY_INFRA_CARDDAV_ENABLED"] = "true";
    helpers = await import("./dav-test-helpers.js");
    services = await import("../services/carddav/devices.js");
    disconnectAll = await import("../services/carddav/disconnect-all.js");
    ({ setDavAuthRedisForTests: setRedis } = await import("../lib/platform/auth/dav-auth.js"));
    fakeRedis = helpers.createFakeRedis();
    setRedis(() => fakeRedis);
    const { createTestApp } = await import("./create-test-app.js");
    app = await createTestApp();
  });

  after(async () => {
    setRedis();
    delete process.env["BONDERY_INFRA_CARDDAV_ENABLED"];
    await app.close();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  async function newDevice() {
    const user = await helpers.createTestUser("dav-cache");
    userIds.push(user.id);
    return { ...(await helpers.createDavDevice(user.id)), user };
  }

  function probe(username: string, key: string) {
    return app.inject({
      headers: { authorization: helpers.basicAuth(username, key) },
      method: "PROPFIND",
      url: "/dav/",
    });
  }

  function cacheKeyNames(): string[] {
    return [...fakeRedis.values.keys()].filter(
      (name) => name.startsWith(VERIFIED_PREFIX) || name.startsWith(VERIFIED_BY_ID_PREFIX),
    );
  }

  function context(user: { email: string; id: string }) {
    return { user: { email: user.email, id: user.id } };
  }

  it("caches a verified key by the SHA-256 of the key and never stores the key", async () => {
    const device = await newDevice();
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);

    const hash = createHash("sha256").update(device.key, "utf8").digest("hex");
    const entry = fakeRedis.values.get(`${VERIFIED_PREFIX}${hash}`);
    assert.deepEqual(JSON.parse(entry ?? "null"), {
      apiKeyId: device.keyId,
      referenceId: device.user.id,
    });
    assert.equal(fakeRedis.values.get(`${VERIFIED_BY_ID_PREFIX}${device.keyId}`), hash);

    for (const [name, value] of fakeRedis.values) {
      assert.equal(name.includes(device.key), false);
      assert.equal(value.includes(device.key), false);
    }
  });

  it("makes no Better Auth call on a cache hit", async () => {
    const device = await newDevice();
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);
    const afterMiss = await prisma.apikey.findUniqueOrThrow({ where: { id: device.keyId } });

    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);
    const afterHits = await prisma.apikey.findUniqueOrThrow({ where: { id: device.keyId } });

    // Better Auth writes `updatedAt` and `lastRequest` on every verify call.
    assert.equal(afterHits.updatedAt.getTime(), afterMiss.updatedAt.getTime());
    assert.equal(afterHits.lastRequest?.getTime(), afterMiss.lastRequest?.getTime());
  });

  it("still checks the username on a cache hit", async () => {
    const device = await newDevice();
    const stranger = await newDevice();
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);

    assert.equal((await probe(stranger.user.id, device.key)).statusCode, 401);
  });

  it("answers 401 for a revoked key within the 60 seconds", async () => {
    const device = await newDevice();
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);

    await services.deleteCarddavDevice(context(device.user), device.deviceId);

    assert.equal((await probe(device.user.id, device.key)).statusCode, 401);
    assert.deepEqual(
      cacheKeyNames().filter((name) => name.endsWith(device.keyId)),
      [],
    );
  });

  it("stops a key whose device row is gone even when the cache entry survives", async () => {
    const device = await newDevice();
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);

    // Delete the key behind the cache's back: the cascade removes the device row.
    await prisma.apikey.delete({ where: { id: device.keyId } });

    assert.ok(cacheKeyNames().some((name) => name.endsWith(device.keyId)));
    assert.equal((await probe(device.user.id, device.key)).statusCode, 401);
  });

  it("answers 401 for the old key after a rotation and accepts the new key", async () => {
    const device = await newDevice();
    assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);

    const rotated = await services.rotateCarddavDevice(
      context(device.user),
      device.deviceId,
      "https://x/dav/",
    );

    assert.equal((await probe(device.user.id, device.key)).statusCode, 401);
    assert.notEqual((await probe(device.user.id, rotated.credentials.password)).statusCode, 401);
    assert.equal(
      cacheKeyNames().some((name) => name.endsWith(device.keyId)),
      false,
    );
  });

  it("answers 401 for every cached key after disconnect all", async () => {
    const first = await newDevice();
    const second = await helpers.createDavDevice(first.user.id, "Second phone");
    assert.notEqual((await probe(first.user.id, first.key)).statusCode, 401);
    assert.notEqual((await probe(first.user.id, second.key)).statusCode, 401);

    await disconnectAll.disconnectAllCarddavDevices(context(first.user));

    assert.equal((await probe(first.user.id, first.key)).statusCode, 401);
    assert.equal((await probe(first.user.id, second.key)).statusCode, 401);
    assert.deepEqual(
      cacheKeyNames().filter((name) => name.endsWith(first.keyId)),
      [],
    );
    assert.deepEqual(
      cacheKeyNames().filter((name) => name.endsWith(second.keyId)),
      [],
    );
  });

  it("falls back to Better Auth when Redis fails", async () => {
    const device = await newDevice();
    setRedis(() => helpers.createBrokenRedis());
    try {
      assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);
      assert.notEqual((await probe(device.user.id, device.key)).statusCode, 401);
      const bad = await probe(device.user.id, `${device.key}x`);
      assert.equal(bad.statusCode, 401);
    } finally {
      setRedis(() => fakeRedis);
    }
  });
});
