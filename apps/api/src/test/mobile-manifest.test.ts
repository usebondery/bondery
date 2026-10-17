import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, describe, it } from "node:test";

import { MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { readRuntimeProductVersion } from "@bondery/helpers/infra/build-metadata";
import { latestProductionCalver } from "@bondery/helpers/version/calver";
import { loadTestEnv } from "./load-test-env.js";

const require = createRequire(import.meta.url);
const { version: packageVersion } = require("../../package.json") as { version: string };

const originalInfraVersion = process.env.BONDERY_INFRA_VERSION;

afterEach(() => {
  if (originalInfraVersion === undefined) {
    delete process.env.BONDERY_INFRA_VERSION;
  } else {
    process.env.BONDERY_INFRA_VERSION = originalInfraVersion;
  }
});

function advertisedLatestVersion(): string {
  return latestProductionCalver(readRuntimeProductVersion(packageVersion), MIN_EXTENSION_VERSION);
}

describe("GET /mobile/manifest", () => {
  it("returns latestVersion without auth", async () => {
    loadTestEnv();
    delete process.env.BONDERY_INFRA_VERSION;

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/mobile/manifest" });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.mobile.latestVersion, advertisedLatestVersion());
    await app.close();
  });
});
