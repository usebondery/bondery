import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, describe, it } from "node:test";

import { getBonderyApiVersion } from "../domains/me/export.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const require = createRequire(import.meta.url);
const { version: apiPackageVersion } = require("../../package.json") as { version: string };

describe("getBonderyApiVersion", () => {
  const originalInfraVersion = process.env.BONDERY_INFRA_VERSION;

  afterEach(() => {
    if (originalInfraVersion === undefined) {
      delete process.env.BONDERY_INFRA_VERSION;
    } else {
      process.env.BONDERY_INFRA_VERSION = originalInfraVersion;
    }
  });

  it("uses a production BONDERY_INFRA_VERSION pin over package.json", () => {
    process.env.BONDERY_INFRA_VERSION = "1.9.2";
    assert.equal(getBonderyApiVersion(), "1.9.2");
  });

  it("falls back to package.json when the pin is unset, beta, or garbage", () => {
    delete process.env.BONDERY_INFRA_VERSION;
    assert.equal(getBonderyApiVersion(), apiPackageVersion);
    process.env.BONDERY_INFRA_VERSION = "beta";
    assert.equal(getBonderyApiVersion(), apiPackageVersion);
    process.env.BONDERY_INFRA_VERSION = "not-a-version";
    assert.equal(getBonderyApiVersion(), apiPackageVersion);
  });
});
