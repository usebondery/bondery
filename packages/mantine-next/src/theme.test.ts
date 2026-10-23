import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BRAND_PRIMARY_COLOR } from "@bondery/branding/colors";
import { bonderyTheme } from "./theme.js";

describe("bonderyTheme", () => {
  it("pins branding-primary shade 5 to BRAND_PRIMARY_COLOR", () => {
    assert.equal(bonderyTheme.colors?.["branding-primary"]?.[5], BRAND_PRIMARY_COLOR);
  });
});
