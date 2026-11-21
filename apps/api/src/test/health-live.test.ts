import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { loadTestEnv } from "./load-test-env.js";

describe("gET /health/live", () => {
  const originalVersion = process.env.BONDERY_INFRA_VERSION;
  const originalGitSha = process.env.BONDERY_INFRA_GIT_SHA;

  afterEach(() => {
    if (originalVersion === undefined) {
      delete process.env.BONDERY_INFRA_VERSION;
    } else {
      process.env.BONDERY_INFRA_VERSION = originalVersion;
    }
    if (originalGitSha === undefined) {
      delete process.env.BONDERY_INFRA_GIT_SHA;
    } else {
      process.env.BONDERY_INFRA_GIT_SHA = originalGitSha;
    }
  });

  it("returns 200 without auth", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/health/live" });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.status, "ok");
    assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(body.extension, undefined);
    await app.close();
  });

  it("includes optional build metadata when env vars are set", async () => {
    loadTestEnv();
    process.env.BONDERY_INFRA_VERSION = "1.8.0-test";
    process.env.BONDERY_INFRA_GIT_SHA = "abc1234";

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/health/live" });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.version, "1.8.0-test");
    assert.equal(body.gitSha, "abc1234");
    await app.close();
  });
});
