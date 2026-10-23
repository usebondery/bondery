import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyPasskeyCeremonyError, nativePasskeyLoginMessage } from "./passkey-ceremony.ts";

describe("classifyPasskeyCeremonyError", () => {
  it("treats OS-sheet abort as silent cancel", () => {
    assert.equal(classifyPasskeyCeremonyError({ code: "ERROR_CEREMONY_ABORTED" }), "cancel");
    assert.equal(classifyPasskeyCeremonyError({ name: "NotAllowedError" }), "cancel");
    assert.equal(classifyPasskeyCeremonyError({ code: "AUTH_CANCELLED" }), "cancel");
  });

  it("maps timeout, missing passkey, and generic failure", () => {
    assert.equal(classifyPasskeyCeremonyError({ name: "TimeoutError" }), "timeout");
    assert.equal(classifyPasskeyCeremonyError({ code: "PASSKEY_NOT_FOUND" }), "not_found");
    assert.equal(classifyPasskeyCeremonyError({ code: "UNKNOWN_ERROR" }), "fail");
  });

  it("returns no copy for a silent OS cancel", () => {
    assert.equal(
      nativePasskeyLoginMessage("cancel", {
        noPasskeyFound: "missing",
        passkeySignInFailed: "failed",
        passkeysUnavailableOnDevice: "device",
        passkeyTimedOut: "timeout",
      }),
      null,
    );
  });
});
