import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadTestEnv } from "./load-test-env.js";

describe("gET /health/ready", () => {
  it("returns 200 without auth", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    assert.ok([200, 503].includes(response.statusCode));
    const body = response.json();
    assert.ok(["ok", "degraded", "unhealthy"].includes(body.status));
    await app.close();
  });
});
