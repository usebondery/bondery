import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BRAND_SPACING_PX, BRAND_SPACING_REM } from "./spacing.js";

describe("brand spacing", () => {
  it("matches Mantine sm/md/lg pixel values at a 16px root", () => {
    assert.equal(BRAND_SPACING_PX.sm, 12);
    assert.equal(BRAND_SPACING_PX.md, 16);
    assert.equal(BRAND_SPACING_PX.lg, 20);
  });

  it("keeps rem strings aligned with the pixel scale", () => {
    assert.equal(BRAND_SPACING_REM.sm, "0.75rem");
    assert.equal(BRAND_SPACING_REM.md, "1rem");
    assert.equal(BRAND_SPACING_REM.lg, "1.25rem");
  });
});
