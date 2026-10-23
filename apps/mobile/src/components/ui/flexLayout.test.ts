import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gapClassName } from "./flexLayout.ts";

describe("gapClassName", () => {
  it("defaults to the md Uniwind token", () => {
    assert.equal(gapClassName(), "gap-md");
  });

  it("maps named sizes onto @theme spacing classes", () => {
    assert.equal(gapClassName("sm"), "gap-sm");
    assert.equal(gapClassName("md"), "gap-md");
    assert.equal(gapClassName("lg"), "gap-lg");
  });
});
