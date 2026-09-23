import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareVersions, isVersionBelow } from "./version-utils.js";

describe("isVersionBelow", () => {
  it("treats equal and newer 3-part versions as not below", () => {
    assert.equal(isVersionBelow("1.9.1", "1.9.1"), false);
    assert.equal(isVersionBelow("1.9.1", "1.9.0"), false);
    assert.equal(isVersionBelow("1.8.0", "1.9.0"), true);
  });

  it("does not 426 Chrome 4-part RC against a 3-part MIN", () => {
    assert.equal(isVersionBelow("1.9.1.1", "1.9.0"), false);
  });

  it("never treats store 1.9.1 as below a 4-part MIN", () => {
    assert.equal(isVersionBelow("1.9.1", "1.9.1.1"), false);
  });

  it("orders SemVer RC below production of the same CalVer", () => {
    assert.equal(isVersionBelow("1.9.1-rc.1", "1.9.1"), true);
    assert.equal(isVersionBelow("1.9.1", "1.9.1-rc.1"), false);
    assert.equal(compareVersions("1.9.1-rc.1", "1.9.1"), -1);
  });
});
