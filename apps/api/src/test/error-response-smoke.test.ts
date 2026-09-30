import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { API_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers";
import { loadTestEnv } from "./load-test-env.js";

describe("error response smoke", () => {
  it("returns 401 with auth_required for unauthenticated session route", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: API_ROUTES.ME_SETTINGS });
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

  it("redirects GET /api-reference and /docs/api to the website OpenAPI reference", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const expected = `${process.env.BONDERY_PUBLIC_WEBSITE_URL?.replace(/\/+$/, "")}${WEBSITE_ROUTES.DOCS_API_REFERENCE}`;

    for (const url of [API_ROUTES.API_REFERENCE, API_ROUTES.DOCS_API]) {
      for (const method of ["GET", "HEAD"] as const) {
        const response = await app.inject({ method, url });
        assert.equal(response.statusCode, 308, `${method} ${url}`);
        assert.equal(response.headers.location, expected, `${method} ${url}`);
      }
    }

    await app.close();
  });

  it("redirects unauthenticated GET /.well-known/mcp to /mcp", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({
      method: "GET",
      url: API_ROUTES.WELL_KNOWN_MCP,
    });
    assert.equal(response.statusCode, 308);
    assert.match(String(response.headers.location ?? ""), /\/mcp$/);
    await app.close();
  });

  it("does not require session auth on Stripe webhooks", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({
      method: "POST",
      url: API_ROUTES.WEBHOOKS_STRIPE,
    });
    assert.notEqual(response.statusCode, 401);
    const body = response.json() as { error: { code: string } };
    assert.ok(
      body.error.code === "bad_request" || body.error.code === "webhook_not_configured",
      `expected signature or config error, got ${body.error.code}`,
    );
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
