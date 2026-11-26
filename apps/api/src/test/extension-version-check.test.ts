import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import {
  EXTENSION_VERSION_HEADER,
  registerExtensionVersionCheck,
} from "../lib/extension/version-check.js";
import type { AppFastifyInstance } from "../lib/platform/fastify-types.js";

/**
 * The gate keys on the extension header, never on the URL or on credentials.
 * A fixed minimum is injected so the 426 path runs whatever the build constant is.
 */
const MIN_VERSION = "2.0.0";
const OUTDATED = "1.9.9";
const CURRENT = "2.0.0";

describe("extension version check", () => {
  let app: FastifyInstance;

  before(async () => {
    app = Fastify();
    registerExtensionVersionCheck(app as unknown as AppFastifyInstance, {
      minVersion: MIN_VERSION,
    });
    app.get("/contacts", async () => ({ ok: true }));
    app.get("/extension/manifest", { config: { allowOutdatedExtension: true } }, async () => ({
      ok: true,
    }));
    app.setNotFoundHandler((_request, reply) => {
      reply.status(404).send({ error: { code: "not_found" } });
    });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it("answers 426 to an outdated extension that sends a Bearer token", async () => {
    const response = await app.inject({
      headers: { authorization: "Bearer token", [EXTENSION_VERSION_HEADER]: OUTDATED },
      method: "GET",
      url: "/contacts",
    });
    assert.equal(response.statusCode, 426);
    assert.equal(response.json().error.code, "extension_outdated");
    assert.equal(response.json().error.details.minVersion, MIN_VERSION);
  });

  it("answers 426 to a malformed extension version", async () => {
    const response = await app.inject({
      headers: { [EXTENSION_VERSION_HEADER]: "not-a-version" },
      method: "GET",
      url: "/contacts",
    });
    assert.equal(response.statusCode, 426);
  });

  it("passes a current extension through", async () => {
    const response = await app.inject({
      headers: { authorization: "Bearer token", [EXTENSION_VERSION_HEADER]: CURRENT },
      method: "GET",
      url: "/contacts",
    });
    assert.equal(response.statusCode, 200);
  });

  it("leaves requests without the extension header to route auth", async () => {
    for (const headers of [{}, { authorization: "Basic dXNlcjpwYXNz" }, { cookie: "a=b" }]) {
      const response = await app.inject({ headers, method: "GET", url: "/contacts" });
      assert.equal(response.statusCode, 200);
    }
  });

  it("lets an outdated extension reach a route that opts out", async () => {
    const response = await app.inject({
      headers: { [EXTENSION_VERSION_HEADER]: OUTDATED },
      method: "GET",
      url: "/extension/manifest",
    });
    assert.equal(response.statusCode, 200);
  });

  it("keeps 404 for an unknown path, even from an outdated extension", async () => {
    const response = await app.inject({
      headers: { [EXTENSION_VERSION_HEADER]: OUTDATED },
      method: "GET",
      url: "/totally-unknown-path",
    });
    assert.equal(response.statusCode, 404);
  });
});

describe("extension version check with enforcement off", () => {
  it("registers no hook when the minimum is 0.0.0", async () => {
    const app = Fastify();
    registerExtensionVersionCheck(app as unknown as AppFastifyInstance, { minVersion: "0.0.0" });
    app.get("/contacts", async () => ({ ok: true }));
    const response = await app.inject({
      headers: { [EXTENSION_VERSION_HEADER]: OUTDATED },
      method: "GET",
      url: "/contacts",
    });
    assert.equal(response.statusCode, 200);
    await app.close();
  });
});
