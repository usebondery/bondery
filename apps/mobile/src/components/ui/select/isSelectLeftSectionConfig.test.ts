import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSelectLeftSectionConfig } from "./selectLeftSectionConfig.ts";

describe("isSelectLeftSectionConfig", () => {
  it("detects typed left section configs", () => {
    assert.equal(isSelectLeftSectionConfig({ emoji: "🙂", type: "emoji" }), true);
    assert.equal(isSelectLeftSectionConfig({ icon: null, type: "icon" }), true);
    assert.equal(
      isSelectLeftSectionConfig({
        backgroundColor: "#fff",
        emoji: "🙂",
        type: "emojiBadge",
      }),
      true,
    );
  });

  it("rejects plain nodes and unknown shapes", () => {
    assert.equal(isSelectLeftSectionConfig(null), false);
    assert.equal(isSelectLeftSectionConfig("flag"), false);
    assert.equal(isSelectLeftSectionConfig({ type: "unknown" }), false);
  });
});
