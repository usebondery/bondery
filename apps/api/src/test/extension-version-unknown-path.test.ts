import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { registerExtensionVersionCheck } from "../lib/extension/version-check.js";

/**
 * The extension-version hook runs `onRequest`, before Fastify resolves a route.
 * It used to answer `401 auth_required` for paths that do not exist, which
 * hides real 404s and makes port scans look like auth failures.
 *
 * `MIN_EXTENSION_VERSION` must be non-default for the hook to do anything, so
 * it is set here and restored afterwards.
 */
const originalMin = process.env.BONDERY_PUBLIC_MIN_EXTENSION_VERSION;

describe("extension version check on unknown paths", () => {
  let app: FastifyInstance;

  before(async () => {
    // The hook reads a build-time constant, not this env var, so drive the guard
    // through the same exported function the server uses.
    app = Fastify();
    app.get("/health/live", async () => ({ status: "ok" }));
    app.get("/me/session", async () => ({ ok: true }));
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({ error: { code: "not_found" } });
    });
    registerExtensionVersionCheck(app);
    await app.ready();
  });

  after(async () => {
    await app.close();
    if (originalMin === undefined) {
      delete process.env.BONDERY_PUBLIC_MIN_EXTENSION_VERSION;
    } else {
      process.env.BONDERY_PUBLIC_MIN_EXTENSION_VERSION = originalMin;
    }
  });

  it("answers 404, not 401, for a path with no route", async () => {
    for (const url of ["/", "/json/version", "/totally-unknown-path"]) {
      const response = await app.inject({ method: "GET", url });
      assert.equal(response.statusCode, 404, `expected 404 for ${url}`);
    }
  });

  it("still enforces auth on a route that exists", async () => {
    const response = await app.inject({ method: "GET", url: "/me/session" });
    // A real route with no credentials must still be rejected. The 404 above is
    // about unknown paths only; existing routes keep their auth.
    assert.equal(response.statusCode, 401);
  });
});
