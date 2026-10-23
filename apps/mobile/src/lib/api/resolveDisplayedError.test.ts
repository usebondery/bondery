import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@bondery/helpers/api";
import { AuthRequiredError } from "../auth/session.ts";
import { resolveDisplayedError } from "./resolveDisplayedError.ts";
import { TransportUnavailableError } from "./transport-unavailable-error.ts";

function mockT(translations: Record<string, string>) {
  return (key: string, options?: { defaultValue?: string }) =>
    translations[key] ?? options?.defaultValue ?? key;
}

const t = mockT({
  "errors.api.contact_not_found": "This contact could not be found.",
  "errors.apiUnreachable": "Can't reach the server.",
  "errors.connection": "Check your connection.",
  "errors.requestFailed": "Request failed.",
  "errors.unknown": "Something went wrong.",
});

describe("resolveDisplayedError", () => {
  it("maps ApiError catalog codes", () => {
    const error = new ApiError({
      code: "contact_not_found",
      developerMessage: "Contact not found",
      status: 404,
    });

    assert.equal(resolveDisplayedError(error, t), "This contact could not be found.");
  });

  it("returns null for unauthorized session failures", () => {
    assert.equal(resolveDisplayedError(new AuthRequiredError("session_revoked"), t), null);
    assert.equal(
      resolveDisplayedError(
        new ApiError({
          code: "auth_required",
          developerMessage: "Unauthorized",
          status: 401,
        }),
        t,
      ),
      null,
    );
  });

  it("maps offline vs unreachable transport failures", () => {
    assert.equal(
      resolveDisplayedError(new TransportUnavailableError("offline"), t),
      "Check your connection.",
    );
    assert.equal(
      resolveDisplayedError(new TransportUnavailableError("unreachable"), t),
      "Can't reach the server.",
    );
  });

  it("falls back to unknown for generic errors", () => {
    assert.equal(resolveDisplayedError(new Error("SQLITE_ERROR"), t), "Something went wrong.");
  });

  it("maps AbortError to requestFailed", () => {
    const aborted = new Error("Aborted");
    aborted.name = "AbortError";
    assert.equal(resolveDisplayedError(aborted, t), "Request failed.");
  });
});
