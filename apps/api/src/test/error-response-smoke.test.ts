import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadTestEnv } from "./load-test-env.js";

describe("error response smoke", () => {
  it("returns 401 with auth_required for unauthenticated session route", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/api/me/settings" });
    assert.equal(response.statusCode, 401);
    const body = response.json() as {
      error: { code: string; message: string; request_id: string; doc_url: string };
    };
    assert.equal(body.error.code, "auth_required");
    assert.ok(body.error.message);
    assert.ok(body.error.request_id);
    assert.match(body.error.doc_url, /\/docs\/api\/errors\/auth_required$/);
    await app.close();
  });

  it("returns 404 with not_found for unknown routes", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({
      headers: { cookie: "bondery-smoke-test=1" },
      method: "GET",
      url: "/definitely-not-a-route",
    });
    assert.equal(response.statusCode, 404);
    const body = response.json() as {
      error: { code: string; message: string; request_id: string };
    };
    assert.equal(body.error.code, "not_found");
    await app.close();
  });
});
