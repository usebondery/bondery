import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { latestProductionCalver } from "@bondery/helpers/version/calver";
import { loadTestEnv } from "./load-test-env.js";

const require = createRequire(import.meta.url);
const { version: packageVersion } = require("../../package.json") as { version: string };

describe("GET /extension/manifest", () => {
  it("returns extension minVersion and latestVersion without auth", async () => {
    loadTestEnv();

    const { createTestApp } = await import("./create-test-app.js");
    const app = await createTestApp();
    const response = await app.inject({ method: "GET", url: "/extension/manifest" });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.extension.minVersion, MIN_EXTENSION_VERSION);
    assert.equal(
      body.extension.latestVersion,
      latestProductionCalver(packageVersion, MIN_EXTENSION_VERSION),
    );
    assert.equal(typeof body.extension.storeUrl, "string");
    await app.close();
  });
});
