import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadTestEnv } from "./load-test-env.js";

describe("GET /status", () => {
  it("returns 200 without auth", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/status" });
    assert.equal(response.statusCode, 200);
    await app.close();
  });
});
