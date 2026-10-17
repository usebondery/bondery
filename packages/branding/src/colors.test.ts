import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BRAND_PRIMARY_COLOR,
  BRAND_PRIMARY_HOVER,
  BRAND_PRIMARY_PRESS,
  BRAND_PRIMARY_SHADES,
  BRAND_SURFACES,
} from "./colors.js";

const SURFACE_KEYS = [
  "body",
  "border",
  "dimmed",
  "hover",
  "mutedCanvas",
  "surface",
  "text",
] as const;

describe("brand colors", () => {
  it("exposes 10 primary shades", () => {
    assert.equal(BRAND_PRIMARY_SHADES.length, 10);
  });

  it("aliases shade indexes 5, 6, and 7", () => {
    assert.equal(BRAND_PRIMARY_COLOR, BRAND_PRIMARY_SHADES[5]);
    assert.equal(BRAND_PRIMARY_HOVER, BRAND_PRIMARY_SHADES[6]);
    assert.equal(BRAND_PRIMARY_PRESS, BRAND_PRIMARY_SHADES[7]);
  });

  it("defines every semantic surface key in light and dark", () => {
    for (const mode of ["dark", "light"] as const) {
      for (const key of SURFACE_KEYS) {
        assert.equal(typeof BRAND_SURFACES[mode][key], "string");
        assert.ok(BRAND_SURFACES[mode][key].length > 0);
      }
    }
  });
});
