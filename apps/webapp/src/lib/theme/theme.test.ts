import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeColorScheme } from "./computeColorScheme.js";
import { sessionColorSchemeManager } from "./sessionColorSchemeManager.js";

describe("computeColorScheme", () => {
  it("returns light for light preference", () => {
    assert.equal(computeColorScheme("light"), "light");
    assert.equal(computeColorScheme("light", true), "light");
  });

  it("returns dark for dark preference", () => {
    assert.equal(computeColorScheme("dark"), "dark");
    assert.equal(computeColorScheme("dark", false), "dark");
  });

  it("resolves auto from prefersDark", () => {
    assert.equal(computeColorScheme("auto", false), "light");
    assert.equal(computeColorScheme("auto", true), "dark");
  });
});

describe("sessionColorSchemeManager", () => {
  it("returns default without persisting", () => {
    const manager = sessionColorSchemeManager();
    assert.equal(manager.get("auto"), "auto");
    assert.doesNotThrow(() => manager.set("dark"));
    assert.equal(manager.get("light"), "light");
    assert.doesNotThrow(() => {
      manager.subscribe(() => {});
      manager.unsubscribe();
      manager.clear();
    });
  });
});
