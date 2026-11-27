/**
 * The CardDAV shell: Basic auth with a `bondery_dav_` device key, the discovery redirect, the
 * unauthenticated OPTIONS probe, and the deployment switch.
 *
 * Needs a migrated Postgres. Better Auth creates real keys. Redis is replaced by a fake, so
 * no Redis server is required.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const SWITCH_ENV = "BONDERY_INFRA_CARDDAV_ENABLED";
const ABSOLUTE_URL_PATTERN = /^https?:\/\//;
const PROPFIND_PATTERN = /PROPFIND/;
const REPORT_PATTERN = /REPORT/;
const CHALLENGE = 'Basic realm="Bondery", charset="UTF-8"';
const TRAILING_SLASHES_PATTERN = /\/+$/;

type Helpers = typeof import("./dav-test-helpers.js");

async function buildTestApp(isEnabled: boolean): Promise<FastifyInstance> {
  process.env[SWITCH_ENV] = isEnabled ? "true" : "false";
  const { createTestApp } = await import("./create-test-app.js");
  return createTestApp();
}

async function useRedis(redis: ReturnType<Helpers["createFakeRedis"]> | null): Promise<void> {
  const { setDavAuthRedisForTests } = await import("../lib/platform/auth/dav-auth.js");
  setDavAuthRedisForTests(redis ? () => redis : undefined);
}

describe("the CardDAV shell with the switch on", () => {
  let app: FastifyInstance;
  let helpers: Helpers;
  let fakeRedis: ReturnType<Helpers["createFakeRedis"]>;
  const userIds: string[] = [];

  before(async () => {
    helpers = await import("./dav-test-helpers.js");
    fakeRedis = helpers.createFakeRedis();
    await useRedis(fakeRedis);
    app = await buildTestApp(true);
  });

  after(async () => {
    await useRedis(null);
    delete process.env["BONDERY_INFRA_CARDDAV_ENABLED"];
    await app.close();
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  async function newDevice() {
    const user = await helpers.createTestUser("dav");
    userIds.push(user.id);
    return { ...(await helpers.createDavDevice(user.id)), user };
  }

  function expectChallenge(response: { headers: Record<string, unknown>; body: string }) {
    assert.equal(response.headers["www-authenticate"], CHALLENGE);
    assert.equal(response.body, "");
  }

  it("answers 401 with the Basic challenge and an empty body without credentials", async () => {
    const response = await app.inject({ method: "PROPFIND", url: "/dav/" });
    assert.equal(response.statusCode, 401);
    expectChallenge(response);
  });

  it("rejects a REST key used as the Basic password", async () => {
    const { user } = await newDevice();
    const rest = await helpers.createRestKey(user.id);
    const response = await app.inject({
      headers: { authorization: helpers.basicAuth(user.id, rest.key) },
      method: "PROPFIND",
      url: "/dav/",
    });
    assert.equal(response.statusCode, 401);
    expectChallenge(response);
  });

  it("rejects a session cookie without Basic credentials", async () => {
    const response = await app.inject({
      headers: { cookie: "better-auth.session_token=anything.signature" },
      method: "GET",
      url: "/dav/addressbooks/x/",
    });
    assert.equal(response.statusCode, 401);
    expectChallenge(response);
  });

  it("rejects a valid key with the wrong username", async () => {
    const { key } = await newDevice();
    const response = await app.inject({
      headers: { authorization: helpers.basicAuth("00000000-0000-4000-8000-000000000000", key) },
      method: "PROPFIND",
      url: "/dav/",
    });
    assert.equal(response.statusCode, 401);
    expectChallenge(response);
  });

  it("answers 501 for a valid key with the matching user UUID", async () => {
    const { key, user } = await newDevice();
    const response = await app.inject({
      headers: {
        authorization: helpers.basicAuth(user.id, key),
        "content-type": "application/xml",
      },
      method: "PROPFIND",
      payload: '<?xml version="1.0"?><propfind xmlns="DAV:"><allprop/></propfind>',
      url: "/dav/",
    });
    assert.equal(response.statusCode, 501);
    assert.equal(response.body, "");

    const nested = await app.inject({
      headers: { authorization: helpers.basicAuth(user.id, key) },
      method: "REPORT",
      url: `/dav/addressbooks/${user.id}/bondery/`,
    });
    assert.equal(nested.statusCode, 501);
  });

  it("rejects a deleted key", async () => {
    const { key, keyId, user } = await newDevice();
    await prisma.apikey.delete({ where: { id: keyId } });
    const response = await app.inject({
      headers: { authorization: helpers.basicAuth(user.id, key) },
      method: "PROPFIND",
      url: "/dav/",
    });
    assert.equal(response.statusCode, 401);
    expectChallenge(response);
  });

  it("caches a rejected key by hash only", async () => {
    const { key, keyId, user } = await newDevice();
    await prisma.apikey.delete({ where: { id: keyId } });
    await app.inject({
      headers: { authorization: helpers.basicAuth(user.id, key) },
      method: "PROPFIND",
      url: "/dav/",
    });
    const names = [...fakeRedis.values.keys()];
    assert.ok(names.some((name) => name.startsWith("bondery:dav:rejected:")));
    for (const name of names) {
      assert.equal(name.includes(key), false);
      assert.equal(name.includes(user.id), false);
    }
  });

  it("does not cache a rejection for a username mismatch", async () => {
    const { key } = await newDevice();
    const rejectedBefore = [...fakeRedis.values.keys()].filter((name) =>
      name.includes(":rejected:"),
    );
    await app.inject({
      headers: { authorization: helpers.basicAuth("someone-else", key) },
      method: "PROPFIND",
      url: "/dav/",
    });
    const rejectedAfter = [...fakeRedis.values.keys()].filter((name) =>
      name.includes(":rejected:"),
    );
    assert.deepEqual(rejectedAfter, rejectedBefore);
  });

  it("answers 429 with Retry-After after 20 failed logins from one address", async () => {
    const { DAV_FAILED_LOGIN_LIMIT } = await import("../lib/platform/auth/dav-login-guard.js");
    await useRedis(helpers.createFakeRedis());
    try {
      for (let attempt = 0; attempt < DAV_FAILED_LOGIN_LIMIT; attempt += 1) {
        const response = await app.inject({
          headers: { authorization: helpers.basicAuth(`user-${attempt}`, "wrong") },
          method: "PROPFIND",
          remoteAddress: "203.0.113.9",
          url: "/dav/",
        });
        assert.equal(response.statusCode, 401, `attempt ${attempt}`);
      }

      const limited = await app.inject({
        headers: { authorization: helpers.basicAuth("user-next", "wrong") },
        method: "PROPFIND",
        remoteAddress: "203.0.113.9",
        url: "/dav/",
      });
      assert.equal(limited.statusCode, 429);
      assert.ok(Number(limited.headers["retry-after"]) >= 1);
    } finally {
      await useRedis(fakeRedis);
    }
  });

  it("limits failed logins per username across addresses", async () => {
    const { DAV_FAILED_LOGIN_LIMIT } = await import("../lib/platform/auth/dav-login-guard.js");
    await useRedis(helpers.createFakeRedis());
    try {
      for (let attempt = 0; attempt < DAV_FAILED_LOGIN_LIMIT; attempt += 1) {
        await app.inject({
          headers: { authorization: helpers.basicAuth("victim", "wrong") },
          method: "PROPFIND",
          remoteAddress: `198.51.100.${attempt + 1}`,
          url: "/dav/",
        });
      }
      const limited = await app.inject({
        headers: { authorization: helpers.basicAuth("victim", "wrong") },
        method: "PROPFIND",
        remoteAddress: "198.51.100.200",
        url: "/dav/",
      });
      assert.equal(limited.statusCode, 429);
    } finally {
      await useRedis(fakeRedis);
    }
  });

  it("keeps serving when Redis fails", async () => {
    const { setDavAuthRedisForTests } = await import("../lib/platform/auth/dav-auth.js");
    const { key, user } = await newDevice();
    setDavAuthRedisForTests(() => helpers.createBrokenRedis());
    try {
      const response = await app.inject({
        headers: { authorization: helpers.basicAuth(user.id, key) },
        method: "PROPFIND",
        url: "/dav/",
      });
      assert.equal(response.statusCode, 501);
    } finally {
      await useRedis(fakeRedis);
    }
  });

  it("redirects /.well-known/carddav to the configured absolute DAV root, without auth", async () => {
    const expected = `${(process.env["BONDERY_PUBLIC_API_URL"] ?? "").replace(TRAILING_SLASHES_PATTERN, "")}/dav/`;
    assert.match(expected, ABSOLUTE_URL_PATTERN);
    for (const method of ["GET", "HEAD", "PROPFIND"] as const) {
      const response = await app.inject({
        headers: method === "PROPFIND" ? { "content-type": "application/xml" } : {},
        method,
        payload: method === "PROPFIND" ? "<propfind xmlns='DAV:'/>" : undefined,
        url: "/.well-known/carddav",
      });
      assert.equal(response.statusCode, 301, method);
      assert.equal(response.headers["location"], expected, method);
    }
  });

  it("answers OPTIONS with the DAV header and an Allow list, without auth", async () => {
    for (const url of ["/dav/", "/dav/addressbooks/x/bondery/"]) {
      const response = await app.inject({ method: "OPTIONS", url });
      assert.equal(response.statusCode, 200, url);
      assert.equal(response.headers["dav"], "1, 3, addressbook");
      assert.match(String(response.headers["allow"]), PROPFIND_PATTERN);
      assert.match(String(response.headers["allow"]), REPORT_PATTERN);
      assert.equal(response.body, "");
    }
  });

  it("keys the rate limit on the device", async () => {
    const { DAV_TIER } = await import("../lib/platform/rate-limit.js");
    const key = DAV_TIER.keyGenerator({
      davDevice: { id: "device-1" },
      ip: "203.0.113.1",
    } as never);
    assert.equal(key, "dav:device-1");
    assert.equal(DAV_TIER.max, 600);
    assert.equal(DAV_TIER.timeWindow, "5 minutes");
  });
});

describe("the CardDAV shell with the switch off", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildTestApp(false);
  });

  after(async () => {
    delete process.env["BONDERY_INFRA_CARDDAV_ENABLED"];
    await app.close();
  });

  it("registers no DAV or discovery route", async () => {
    for (const [method, url] of [
      ["PROPFIND", "/dav/"],
      ["GET", "/dav/addressbooks/x/"],
      ["GET", "/.well-known/carddav"],
    ] as const) {
      const response = await app.inject({ method, url });
      assert.equal(response.statusCode, 404, `${method} ${url}`);
    }
  });
});
