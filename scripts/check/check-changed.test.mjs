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

  it("tests the sample-data tooling when the fixture corpus changes", () => {
    assert.ok(names(["packages/tests/sample-data/anonymize.mjs"]).includes("sample-data"));
    assert.ok(
      names(["packages/tests/sample-data/base-contact-values.json"]).includes("sample-data"),
    );
    assert.ok(!names(["apps/api/src/main.ts"]).includes("sample-data"));
  });

  it("runs the importer tests when a parser, a commit step, or the corpus changes", () => {
    assert.ok(names(["packages/tests/importers/commit.test.ts"]).includes("importer-tests"));
    assert.ok(
      names(["packages/tests/sample-data/samsung/contacts.vcf"]).includes("importer-tests"),
    );
    assert.ok(names(["apps/api/src/routes/import/vcard/parser.ts"]).includes("importer-tests"));
    assert.ok(names(["apps/api/src/domains/import/linkedin.ts"]).includes("importer-tests"));
    assert.ok(names(["apps/api/src/lib/integrations/mapy.ts"]).includes("importer-tests"));
    assert.ok(!names(["apps/api/src/routes/tags/index.ts"]).includes("importer-tests"));
  });

  it("lints and tests when a Biome plugin changes", () => {
    const plan = names(["biome/plugins/no-unsafe-secret-compare.grit"]);
    assert.ok(plan.includes("biome"));
    assert.ok(plan.includes("check-script-tests"));
    assert.ok(plan.includes("diagnostic-messages"));
  });

  it("checks diagnostic wording when a check script changes", () => {
    assert.ok(names(["scripts/check/check-docs-links.mjs"]).includes("diagnostic-messages"));
    assert.ok(!names(["docs/api/index.mdx"]).includes("diagnostic-messages"));
  });

  it("honours --only", () => {
    assert.deepEqual(names(["apps/api/src/main.ts"], ["biome"]), ["biome"]);
  });

  it("checks tsconfig extends for a tsconfig path and not for an unrelated md file", () => {
    assert.ok(names(["apps/webapp/tsconfig.json"]).includes("tsconfig-extends"));
    assert.ok(names(["packages/typescript-config/base.json"]).includes("tsconfig-extends"));
    assert.ok(!names(["README.md"]).includes("tsconfig-extends"));
  });
});
