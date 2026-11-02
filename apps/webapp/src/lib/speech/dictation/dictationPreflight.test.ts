import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkDictationPreflight } from "./dictationPreflight.js";

describe("checkDictationPreflight", () => {
  it("allows a supported, secure, online page", () => {
    assert.equal(checkDictationPreflight({ online: true, secure: true, supported: true }), null);
  });

  it("reports an unsupported browser first", () => {
    assert.equal(
      checkDictationPreflight({ online: true, secure: true, supported: false }),
      "unsupported",
    );
  });

  it("reports an insecure origin before connectivity", () => {
    assert.equal(
      checkDictationPreflight({ online: false, secure: false, supported: true }),
      "insecure",
    );
  });

  it("reports an offline page as offline, not as a service failure", () => {
    // The recognizer reports `network` here. That message blames the user's
    // connection only after the microphone prompt has already passed.
    assert.equal(
      checkDictationPreflight({ online: false, secure: true, supported: true }),
      "offline",
    );
  });
});
