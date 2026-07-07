import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveContactSocialFieldCommit } from "./socials-helpers.js";

describe("resolveContactSocialFieldCommit", () => {
  it("returns noop when draft is empty and nothing persisted", () => {
    assert.deepEqual(resolveContactSocialFieldCommit("linkedin", "", ""), { action: "noop" });
    assert.deepEqual(resolveContactSocialFieldCommit("linkedin", "   ", ""), { action: "noop" });
  });

  it("returns clear when draft is empty but a value was persisted", () => {
    assert.deepEqual(resolveContactSocialFieldCommit("linkedin", "", "johndoe"), {
      action: "clear",
    });
    assert.deepEqual(resolveContactSocialFieldCommit("website", "  ", "https://example.com"), {
      action: "clear",
    });
  });

  it("returns noop when processed value matches persisted", () => {
    assert.deepEqual(resolveContactSocialFieldCommit("linkedin", "johndoe", "johndoe"), {
      action: "noop",
    });
  });

  it("returns save when value changes", () => {
    assert.deepEqual(resolveContactSocialFieldCommit("linkedin", "janedoe", "johndoe"), {
      action: "save",
      value: "janedoe",
    });
  });

  it("normalizes linkedin URLs before comparing", () => {
    assert.deepEqual(
      resolveContactSocialFieldCommit(
        "linkedin",
        "https://www.linkedin.com/in/johndoe",
        "johndoe",
      ),
      { action: "noop" },
    );
  });

  it("returns error for invalid website when non-empty", () => {
    assert.deepEqual(resolveContactSocialFieldCommit("website", "not a url", ""), {
      action: "error",
      code: "invalid_website",
    });
  });

  it("clears whatsapp when number is removed", () => {
    assert.deepEqual(
      resolveContactSocialFieldCommit("whatsapp", "", "+14155552671", { dialCode: "+1" }),
      { action: "clear" },
    );
  });

  it("saves whatsapp with dial code", () => {
    assert.deepEqual(
      resolveContactSocialFieldCommit("whatsapp", "4155552671", "", { dialCode: "+1" }),
      { action: "save", value: "+14155552671" },
    );
  });
});
