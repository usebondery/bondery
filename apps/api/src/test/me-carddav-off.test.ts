/**
 * `/me/carddav` with the deployment switch off: `GET` reports `enabled: false` and every other
 * route answers 404 `carddav_not_enabled`.
 *
 * Needs a migrated Postgres.
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

type Helpers = typeof import("./dav-test-helpers.js");

async function buildTestApp(): Promise<FastifyInstance> {
  process.env["BONDERY_INFRA_CARDDAV_ENABLED"] = "false";
  const { createTestApp } = await import("./create-test-app.js");
  return createTestApp();
}

function errorCode(body: string): string | undefined {
  return (JSON.parse(body) as { error?: { code?: string } }).error?.code;
}

describe("/me/carddav with the switch off", () => {
  let app: FastifyInstance;
  let helpers: Helpers;
  const userIds: string[] = [];
  let restoreRedis: () => void;

  before(async () => {
    helpers = await import("./dav-test-helpers.js");
    restoreRedis = await helpers.installInMemoryRedisCommands();
    app = await buildTestApp();
  });

  after(async () => {
    restoreRedis();
    delete process.env["BONDERY_INFRA_CARDDAV_ENABLED"];
    await app.close();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("reports enabled: false with no devices and answers 404 carddav_not_enabled elsewhere", async () => {
    const user = await helpers.createTestUser("carddav-off");
    userIds.push(user.id);
    const { provisionNewUser } = await import("../lib/auth/provision-new-user.js");
    await provisionNewUser({ name: "CardDAV Off", userId: user.id });
    const device = await helpers.createDavDevice(user.id);
    const sessionToken = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        token: sessionToken,
        userId: user.id,
      },
    });
    const headers = { authorization: `Bearer ${sessionToken}` };

    const list = await app.inject({ headers, method: "GET", url: "/me/carddav" });
    assert.equal(list.statusCode, 200, list.body);
    const { carddav } = JSON.parse(list.body);
    assert.equal(carddav.enabled, false);
    assert.deepEqual(carddav.devices, []);

    const id = device.deviceId;
    const json = { ...headers, "content-type": "application/json" };
    const attempts = [
      await app.inject({
        headers: json,
        method: "POST",
        payload: { name: "x" },
        url: "/me/carddav/devices",
      }),
      await app.inject({
        headers: json,
        method: "PATCH",
        payload: { name: "x" },
        url: `/me/carddav/devices/${id}`,
      }),
      await app.inject({ headers, method: "POST", url: `/me/carddav/devices/${id}/rotate` }),
      await app.inject({ headers, method: "POST", url: `/me/carddav/devices/${id}/resume` }),
      await app.inject({ headers, method: "DELETE", url: `/me/carddav/devices/${id}` }),
      await app.inject({ headers, method: "DELETE", url: "/me/carddav" }),
    ];
    for (const response of attempts) {
      assert.equal(response.statusCode, 404, response.body);
      assert.equal(errorCode(response.body), "carddav_not_enabled");
    }
    assert.equal(await prisma.carddavDevice.count({ where: { userId: user.id } }), 1);
  });
});
