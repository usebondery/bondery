import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDictationAvailability } from "./dictationAvailability.js";

describe("resolveDictationAvailability", () => {
  it("is available on a secure origin with a recognizer", () => {
    assert.equal(resolveDictationAvailability({ secure: true, supported: true }), "available");
  });

  it("is insecure on an insecure origin with a recognizer", () => {
    assert.equal(resolveDictationAvailability({ secure: false, supported: true }), "insecure");
  });

  it("is unsupported when the browser has no recognizer", () => {
    assert.equal(resolveDictationAvailability({ secure: true, supported: false }), "unsupported");
  });

  it("reports unsupported before insecure when both apply", () => {
    assert.equal(resolveDictationAvailability({ secure: false, supported: false }), "unsupported");
  });
});
