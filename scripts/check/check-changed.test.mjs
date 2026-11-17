import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planChecks } from "./check-changed.mjs";

const names = (files, only) => planChecks(files, only).map((check) => check.name);

describe("planChecks", () => {
  it("always includes the stopgap wording check", () => {
    assert.deepEqual(names(["README.md"]), ["stopgap-wording"]);
  });

  it("runs biome and types for app code", () => {
    const plan = names(["apps/api/src/main.ts"]);
    assert.ok(plan.includes("biome"));
    assert.ok(plan.includes("types"));
    assert.ok(plan.includes("api-errors"));
    assert.ok(plan.includes("openapi"));
  });

  it("scopes docs and i18n checks to their paths", () => {
    assert.ok(names(["docs/contributing/local-setup.mdx"]).includes("docs"));
    assert.ok(!names(["apps/api/src/main.ts"]).includes("docs"));
    assert.ok(names(["packages/translations/src/x.ts"]).includes("i18n"));
    assert.ok(!names(["apps/api/src/main.ts"]).includes("i18n"));
  });

  it("tests the check scripts when they change", () => {
    assert.ok(names(["scripts/check/check-changed.mjs"]).includes("check-script-tests"));
  });

  it("honours --only", () => {
    assert.deepEqual(names(["apps/api/src/main.ts"], ["biome"]), ["biome"]);
  });
});
