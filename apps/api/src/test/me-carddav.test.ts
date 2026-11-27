/**
 * CardDAV device management under `/me/carddav`: the lifecycle, the device cap, step-up,
 * tenant isolation, the deployment switch, and the cleanup of keys after a failed write.
 *
 * Needs a migrated Postgres. Better Auth creates real keys. Redis is replaced by two in-memory
 * stand-ins: a fake for the DAV shell, and method stubs on the command client for step-up.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { BONDERY_STEP_UP_HEADER } from "@bondery/helpers/globals/paths";
import { CARDDAV_KEY_PREFIX, CARDDAV_LIMITS } from "@bondery/schemas";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const SWITCH_ENV = "BONDERY_INFRA_CARDDAV_ENABLED";
const TRAILING_SLASHES_PATTERN = /\/+$/;
const FAILING_CREATE_NAME = "fail-on-insert";
const FAILING_ROTATE_NAME = "fail-on-update";

type Helpers = typeof import("./dav-test-helpers.js");

type DeviceBody = {
  clientFamily: string | null;
  createdAt: string;
  id: string;
  keyStart: string;
  lastSeenAt: string | null;
  lastSyncedAt: string | null;
  name: string;
  pausedAt: string | null;
};
type CredentialsBody = { password: string; serverUrl: string; username: string };

async function buildTestApp(isEnabled: boolean): Promise<FastifyInstance> {
  process.env[SWITCH_ENV] = isEnabled ? "true" : "false";
  const { createTestApp } = await import("./create-test-app.js");
  return createTestApp();
}

function errorCode(body: string): string | undefined {
  return (JSON.parse(body) as { error?: { code?: string } }).error?.code;
}

describe("/me/carddav with the switch on", () => {
  let app: FastifyInstance;
  let helpers: Helpers;
  let services: typeof import("../services/carddav/devices.js");
  const userIds: string[] = [];
  let restoreRedis: () => void;

  before(async () => {
    helpers = await import("./dav-test-helpers.js");
    services = await import("../services/carddav/devices.js");
    const { setDavAuthRedisForTests } = await import("../lib/platform/auth/dav-auth.js");
    const fakeRedis = helpers.createFakeRedis();
    setDavAuthRedisForTests(() => fakeRedis);

    restoreRedis = await helpers.installInMemoryRedisCommands();

    await prisma.$executeRawUnsafe(
      "DROP TRIGGER IF EXISTS carddav_test_fail_device_write ON carddav_devices",
    );
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION carddav_test_fail_device_write() RETURNS trigger AS $$
      BEGIN
        IF NEW.name = '${FAILING_CREATE_NAME}' AND TG_OP = 'INSERT' THEN
          RAISE EXCEPTION 'carddav test: forced insert failure';
        END IF;
        IF NEW.name = '${FAILING_ROTATE_NAME}' AND TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'carddav test: forced update failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER carddav_test_fail_device_write
      BEFORE INSERT OR UPDATE ON carddav_devices
      FOR EACH ROW EXECUTE FUNCTION carddav_test_fail_device_write()`);

    app = await buildTestApp(true);
  });

  after(async () => {
    await prisma.$executeRawUnsafe(
      "DROP TRIGGER IF EXISTS carddav_test_fail_device_write ON carddav_devices",
    );
    await prisma.$executeRawUnsafe("DROP FUNCTION IF EXISTS carddav_test_fail_device_write()");
    restoreRedis();
    const { setDavAuthRedisForTests } = await import("../lib/platform/auth/dav-auth.js");
    setDavAuthRedisForTests();
    delete process.env["BONDERY_INFRA_CARDDAV_ENABLED"];
    await app.close();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  async function newUser() {
    const user = await helpers.createTestUser("carddav-me");
    userIds.push(user.id);
    const { provisionNewUser } = await import("../lib/auth/provision-new-user.js");
    await provisionNewUser({ name: "CardDAV Test", userId: user.id });
    const sessionToken = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        token: sessionToken,
        userId: user.id,
      },
    });
    return { ...user, sessionToken };
  }

  type TestUser = Awaited<ReturnType<typeof newUser>>;

  async function call(
    user: TestUser,
    method: "DELETE" | "GET" | "PATCH" | "POST",
    url: string,
    options: { headers?: Record<string, string>; payload?: unknown; stepUp?: boolean } = {},
  ) {
    const headers: Record<string, string> = {
      authorization: `Bearer ${user.sessionToken}`,
      ...options.headers,
    };
    if (options.payload !== undefined) {
      headers["content-type"] = "application/json";
    }
    if (options.stepUp) {
      const { mintStepUpToken } = await import("../lib/auth/step-up-redis.js");
      headers[BONDERY_STEP_UP_HEADER] = await mintStepUpToken(user.id);
    }
    return app.inject({ headers, method, payload: options.payload as object, url });
  }

  async function connect(user: TestUser, name = "Phone") {
    const response = await call(user, "POST", "/me/carddav/devices", {
      payload: { name },
      stepUp: true,
    });
    assert.equal(response.statusCode, 201, response.body);
    return JSON.parse(response.body) as { credentials: CredentialsBody; device: DeviceBody };
  }

  function davProbe(userId: string, key: string) {
    return app.inject({
      headers: { authorization: helpers.basicAuth(userId, key) },
      method: "PROPFIND",
      url: "/dav/",
    });
  }

  function context(user: TestUser) {
    return { user: { email: user.email, id: user.id } };
  }

  it("lists no devices for a new account and builds the server URL from the environment", async () => {
    const user = await newUser();
    const response = await call(user, "GET", "/me/carddav");
    assert.equal(response.statusCode, 200, response.body);

    const { carddav } = JSON.parse(response.body);
    const apiUrl = (process.env["BONDERY_PUBLIC_API_URL"] ?? "").replace(
      TRAILING_SLASHES_PATTERN,
      "",
    );
    assert.deepEqual(carddav, {
      devices: [],
      enabled: true,
      maxDevices: CARDDAV_LIMITS.maxDevicesPerUser,
      serverUrl: `${apiUrl}/dav/`,
      username: user.id,
    });
  });

  it("creates a device, shows the password once, and the key opens the address book", async () => {
    const user = await newUser();
    const created = await connect(user, "Pixel 9");

    assert.ok(created.credentials.password.startsWith(CARDDAV_KEY_PREFIX));
    assert.equal(created.credentials.username, user.id);
    assert.equal(created.device.name, "Pixel 9");
    assert.equal(created.device.pausedAt, null);
    assert.equal(created.device.lastSyncedAt, null);
    assert.ok(created.credentials.password.startsWith(created.device.keyStart));

    const key = await prisma.apikey.findFirstOrThrow({
      where: { configId: "carddav", referenceId: user.id },
    });
    assert.equal(key.name, "Pixel 9");
    assert.equal(await prisma.carddavAddressBook.count({ where: { userId: user.id } }), 1);

    const listed = await call(user, "GET", "/me/carddav");
    const { carddav } = JSON.parse(listed.body) as { carddav: { devices: DeviceBody[] } };
    assert.deepEqual(
      carddav.devices.map((device) => device.id),
      [created.device.id],
    );
    assert.equal(listed.body.includes(created.credentials.password), false);

    const probe = await davProbe(user.id, created.credentials.password);
    assert.notEqual(probe.statusCode, 401);
  });

  it("requires step-up to create, rotate, remove and disconnect, and changes nothing without it", async () => {
    const user = await newUser();
    const created = await connect(user);

    const noCreate = await call(user, "POST", "/me/carddav/devices", { payload: { name: "x" } });
    const noRotate = await call(user, "POST", `/me/carddav/devices/${created.device.id}/rotate`);
    const noRemove = await call(user, "DELETE", `/me/carddav/devices/${created.device.id}`);
    const noDisconnect = await call(user, "DELETE", "/me/carddav");
    for (const response of [noCreate, noRotate, noRemove, noDisconnect]) {
      assert.equal(response.statusCode, 403, response.body);
      assert.equal(errorCode(response.body), "session_not_fresh");
    }

    assert.equal(await prisma.carddavDevice.count({ where: { userId: user.id } }), 1);
    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      1,
    );
  });

  it("rejects an Idempotency-Key on the routes that return a password", async () => {
    const user = await newUser();
    const created = await connect(user);

    const create = await call(user, "POST", "/me/carddav/devices", {
      headers: { "idempotency-key": "carddav-create-1" },
      payload: { name: "Replay" },
      stepUp: true,
    });
    const rotate = await call(user, "POST", `/me/carddav/devices/${created.device.id}/rotate`, {
      headers: { "idempotency-key": "carddav-rotate-1" },
      stepUp: true,
    });
    for (const response of [create, rotate]) {
      assert.equal(response.statusCode, 400, response.body);
      assert.equal(errorCode(response.body), "idempotency_key_unsupported");
    }
    assert.equal(await prisma.carddavDevice.count({ where: { userId: user.id } }), 1);
  });

  it("renames the device and its key", async () => {
    const user = await newUser();
    const created = await connect(user, "Old name");

    const response = await call(user, "PATCH", `/me/carddav/devices/${created.device.id}`, {
      payload: { name: "New name" },
    });
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(JSON.parse(response.body).device.name, "New name");

    const key = await prisma.apikey.findFirstOrThrow({
      where: { configId: "carddav", referenceId: user.id },
    });
    assert.equal(key.name, "New name");
  });

  it("rotates the key: the old password stops, the new one works, one key remains", async () => {
    const user = await newUser();
    const created = await connect(user);
    assert.notEqual((await davProbe(user.id, created.credentials.password)).statusCode, 401);

    const response = await call(user, "POST", `/me/carddav/devices/${created.device.id}/rotate`, {
      stepUp: true,
    });
    assert.equal(response.statusCode, 200, response.body);
    const rotated = JSON.parse(response.body) as {
      credentials: CredentialsBody;
      device: DeviceBody;
    };

    assert.equal(rotated.device.id, created.device.id);
    assert.notEqual(rotated.credentials.password, created.credentials.password);
    assert.equal((await davProbe(user.id, created.credentials.password)).statusCode, 401);
    assert.notEqual((await davProbe(user.id, rotated.credentials.password)).statusCode, 401);
    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      1,
    );
  });

  it("revokes a device: its password answers 401 and the key and row are gone", async () => {
    const user = await newUser();
    const created = await connect(user);
    assert.notEqual((await davProbe(user.id, created.credentials.password)).statusCode, 401);

    const response = await call(user, "DELETE", `/me/carddav/devices/${created.device.id}`, {
      stepUp: true,
    });
    assert.equal(response.statusCode, 204, response.body);

    assert.equal((await davProbe(user.id, created.credentials.password)).statusCode, 401);
    assert.equal(await prisma.carddavDevice.count({ where: { userId: user.id } }), 0);
    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      0,
    );
  });

  it("resumes a paused device", async () => {
    const user = await newUser();
    const created = await connect(user);
    await prisma.carddavDevice.update({
      data: { pausedAt: new Date() },
      where: { id: created.device.id },
    });

    const response = await call(user, "POST", `/me/carddav/devices/${created.device.id}/resume`);
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(JSON.parse(response.body).device.pausedAt, null);
    const row = await prisma.carddavDevice.findUniqueOrThrow({ where: { id: created.device.id } });
    assert.equal(row.pausedAt, null);
  });

  it("answers 404 carddav_device_not_found for another user's device on every device route", async () => {
    const owner = await newUser();
    const other = await newUser();
    const created = await connect(owner);
    const { id } = created.device;

    const attempts = [
      await call(other, "PATCH", `/me/carddav/devices/${id}`, { payload: { name: "Mine now" } }),
      await call(other, "POST", `/me/carddav/devices/${id}/rotate`, { stepUp: true }),
      await call(other, "POST", `/me/carddav/devices/${id}/resume`),
      await call(other, "DELETE", `/me/carddav/devices/${id}`, { stepUp: true }),
    ];
    for (const response of attempts) {
      assert.equal(response.statusCode, 404, response.body);
      assert.equal(errorCode(response.body), "carddav_device_not_found");
    }

    const otherList = JSON.parse((await call(other, "GET", "/me/carddav")).body);
    assert.deepEqual(otherList.carddav.devices, []);
    const row = await prisma.carddavDevice.findUniqueOrThrow({ where: { id } });
    assert.equal(row.name, "Phone");
    assert.notEqual((await davProbe(owner.id, created.credentials.password)).statusCode, 401);
  });

  it("disconnects all: deletes keys, devices, cards and versions, and keeps persons and extras", async () => {
    const user = await newUser();
    await connect(user, "One");
    await connect(user, "Two");
    const restKey = await helpers.createRestKey(user.id);

    const book = await prisma.carddavAddressBook.findUniqueOrThrow({ where: { userId: user.id } });
    const person = await prisma.people.create({ data: { firstName: "Ada", userId: user.id } });
    await prisma.peopleVcardExtras.create({
      data: { personId: person.id, properties: { "X-TEST": "1" }, userId: user.id },
    });
    const card = await prisma.carddavCard.create({
      data: {
        addressBookId: book.id,
        etag: "etag-1",
        href: `${person.id}.vcf`,
        kind: "person",
        personId: person.id,
        projection: {},
        revision: 7n,
        uid: person.id,
        userId: user.id,
      },
    });
    await prisma.carddavCardVersion.create({
      data: { cardId: card.id, etag: "etag-0", projection: {} },
    });
    await prisma.carddavAddressBook.update({
      data: {
        projectionVersion: 4,
        rebuildAfterPersonId: person.id,
        rebuildHead: 90n,
        reconciledThrough: 40n,
        revision: 7n,
        tombstoneFloor: 3n,
      },
      where: { id: book.id },
    });

    const response = await call(user, "DELETE", "/me/carddav", { stepUp: true });
    assert.equal(response.statusCode, 204, response.body);

    assert.equal(await prisma.carddavDevice.count({ where: { userId: user.id } }), 0);
    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      0,
    );
    assert.equal(await prisma.carddavCard.count({ where: { userId: user.id } }), 0);
    assert.equal(await prisma.carddavCardVersion.count({ where: { cardId: card.id } }), 0);

    const reset = await prisma.carddavAddressBook.findUniqueOrThrow({ where: { userId: user.id } });
    assert.equal(reset.id, book.id);
    assert.notEqual(reset.generation, book.generation);
    assert.equal(reset.revision, 0n);
    assert.equal(reset.reconciledThrough, 0n);
    assert.equal(reset.tombstoneFloor, 0n);
    assert.equal(reset.projectionVersion, 0);
    assert.equal(reset.rebuildHead, null);
    assert.equal(reset.rebuildAfterPersonId, null);

    assert.equal(await prisma.people.count({ where: { id: person.id } }), 1);
    assert.equal(await prisma.peopleVcardExtras.count({ where: { personId: person.id } }), 1);
    assert.equal(await prisma.apikey.count({ where: { id: restKey.keyId } }), 1);
  });

  it("never lists device keys on /me/api-keys", async () => {
    const user = await newUser();
    await connect(user);

    const response = await call(user, "GET", "/me/api-keys");
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(JSON.parse(response.body).totalCount, 0);
  });

  it("rejects a DAV key and a REST key on /me/carddav", async () => {
    const user = await newUser();
    const created = await connect(user);
    const restKey = await helpers.createRestKey(user.id);

    for (const secret of [created.credentials.password, restKey.key]) {
      const response = await app.inject({
        headers: { authorization: `Bearer ${secret}` },
        method: "GET",
        url: "/me/carddav",
      });
      assert.equal(response.statusCode, 401, response.body);
    }
  });

  it("gives exactly five devices under six parallel creates", async () => {
    const user = await newUser();
    const results = await Promise.allSettled(
      Array.from({ length: CARDDAV_LIMITS.maxDevicesPerUser + 1 }, (_, index) =>
        services.createCarddavDevice(
          context(user),
          { name: `Parallel ${index}` },
          "https://x/dav/",
        ),
      ),
    );

    const rejected = results.filter((result) => result.status === "rejected");
    assert.equal(rejected.length, 1);
    const reason = (rejected[0] as PromiseRejectedResult).reason as {
      code?: string;
      statusCode?: number;
    };
    assert.equal(reason.code, "carddav_device_limit_exceeded");
    assert.equal(reason.statusCode, 409);

    assert.equal(
      await prisma.carddavDevice.count({ where: { userId: user.id } }),
      CARDDAV_LIMITS.maxDevicesPerUser,
    );
    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      CARDDAV_LIMITS.maxDevicesPerUser,
    );
  });

  it("answers 409 on the sixth create over HTTP", async () => {
    const user = await newUser();
    for (let index = 0; index < CARDDAV_LIMITS.maxDevicesPerUser; index += 1) {
      await connect(user, `Phone ${index}`);
    }
    const response = await call(user, "POST", "/me/carddav/devices", {
      payload: { name: "One too many" },
      stepUp: true,
    });
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(errorCode(response.body), "carddav_device_limit_exceeded");
  });

  it("leaves no orphan key when the device insert fails", async () => {
    const user = await newUser();
    await assert.rejects(
      services.createCarddavDevice(context(user), { name: FAILING_CREATE_NAME }, "https://x/dav/"),
    );

    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      0,
    );
    assert.equal(await prisma.carddavDevice.count({ where: { userId: user.id } }), 0);
  });

  it("keeps the old key and leaves no orphan when a rotation fails", async () => {
    const user = await newUser();
    const created = await connect(user, FAILING_ROTATE_NAME);

    await assert.rejects(
      services.rotateCarddavDevice(context(user), created.device.id, "https://x/dav/"),
    );

    assert.equal(
      await prisma.apikey.count({ where: { configId: "carddav", referenceId: user.id } }),
      1,
    );
    assert.notEqual((await davProbe(user.id, created.credentials.password)).statusCode, 401);
  });
});
