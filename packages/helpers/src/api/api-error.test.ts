import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiError,
  buildApiErrorFromResponse,
  extractApiErrorFields,
  getAuthUserFacingError,
  getBetterAuthUserMessage,
  getUserFacingError,
  isUnauthorizedApiError,
} from "./index.js";
import type { ApiErrorTranslateFn } from "./types.js";

function mockT(translations: Record<string, string>): ApiErrorTranslateFn {
  return ((key: string, options?: { defaultValue?: string }) =>
    translations[key] ?? options?.defaultValue ?? key) as ApiErrorTranslateFn;
}

describe("extractApiErrorFields", () => {
  it("parses nested Stripe-style error JSON", () => {
    const body = JSON.stringify({
      error: {
        code: "contact_not_found",
        doc_url: "https://bondery.com/docs/api/errors/contact_not_found",
        message: "Contact not found",
        param: "contact_id",
        request_id: "req_123",
        type: "invalid_request_error",
      },
    });

    assert.deepEqual(extractApiErrorFields(body), {
      code: "contact_not_found",
      developerMessage: "Contact not found",
      docUrl: "https://bondery.com/docs/api/errors/contact_not_found",
      param: "contact_id",
      requestId: "req_123",
      type: "invalid_request_error",
    });
  });

  it("returns empty fields for invalid JSON", () => {
    assert.deepEqual(extractApiErrorFields("not json"), {
      code: null,
      developerMessage: null,
      docUrl: null,
      param: null,
      requestId: null,
      type: null,
    });
  });
});

describe("buildApiErrorFromResponse", () => {
  it("builds ApiError with defaults for missing fields", () => {
    const error = buildApiErrorFromResponse({
      bodyText: "{}",
      status: 500,
    });

    assert.equal(error.status, 500);
    assert.equal(error.code, "internal_server_error");
    assert.equal(error.developerMessage, "HTTP 500");
  });
});

describe("ApiError.getUserMessage", () => {
  it("maps known catalog code to translation key", () => {
    const error = new ApiError({
      code: "contact_not_found",
      developerMessage: "Contact not found",
      status: 404,
    });

    const message = error.getUserMessage(
      mockT({
        "errors.api.contact_not_found": "We could not find that contact.",
      }),
    );

    assert.equal(message, "We could not find that contact.");
  });

  it("prefers param validation message when present", () => {
    const error = new ApiError({
      code: "validation_error",
      developerMessage: "Invalid email",
      param: "email",
      status: 400,
    });

    const message = error.getUserMessage(
      mockT({
        "errors.api.validation_error": "Validation failed.",
        "errors.validation.email": "Enter a valid email address.",
      }),
    );

    assert.equal(message, "Enter a valid email address.");
  });

  it("falls back to unknown for unrecognized code", () => {
    const error = new ApiError({
      code: "not_a_real_code",
      developerMessage: "Server blew up",
      status: 500,
    });

    const message = error.getUserMessage(
      mockT({
        "errors.unknown": "Something went wrong.",
      }),
    );

    assert.equal(message, "Something went wrong.");
  });
});

describe("getUserFacingError", () => {
  it("delegates ApiError to getUserMessage", () => {
    const error = new ApiError({
      code: "contact_not_found",
      developerMessage: "Contact not found",
      status: 409,
    });

    const message = getUserFacingError(
      error,
      mockT({
        "errors.api.contact_not_found": "Contact missing.",
      }),
    );

    assert.equal(message, "Contact missing.");
  });

  it("maps AbortError to requestFailed", () => {
    const abort = new Error("Aborted");
    abort.name = "AbortError";

    const message = getUserFacingError(
      abort,
      mockT({
        "errors.requestFailed": "Request was cancelled.",
      }),
    );

    assert.equal(message, "Request was cancelled.");
  });

  it("maps generic errors to unknown", () => {
    const message = getUserFacingError(
      new Error("network"),
      mockT({
        "errors.unknown": "Something went wrong.",
      }),
    );

    assert.equal(message, "Something went wrong.");
  });
});

describe("isUnauthorizedApiError", () => {
  it("returns true for 401 ApiError", () => {
    const error = new ApiError({
      code: "unauthorized",
      developerMessage: "Unauthorized",
      status: 401,
    });

    assert.equal(isUnauthorizedApiError(error), true);
  });

  it("returns false for non-401 ApiError", () => {
    const error = new ApiError({
      code: "forbidden",
      developerMessage: "Forbidden",
      status: 403,
    });

    assert.equal(isUnauthorizedApiError(error), false);
  });
});

describe("getBetterAuthUserMessage", () => {
  it("maps known auth code to translation key", () => {
    const message = getBetterAuthUserMessage(
      "INVALID_EMAIL_OR_PASSWORD",
      mockT({
        "errors.auth.INVALID_EMAIL_OR_PASSWORD": "Invalid email or password.",
      }),
    );

    assert.equal(message, "Invalid email or password.");
  });

  it("falls back to unknown for unrecognized auth code", () => {
    const message = getBetterAuthUserMessage(
      "NOT_A_REAL_AUTH_CODE",
      mockT({
        "errors.unknown": "Something went wrong.",
      }),
    );

    assert.equal(message, "Something went wrong.");
  });
});

describe("getAuthUserFacingError", () => {
  it("maps Better Auth client error by code", () => {
    const message = getAuthUserFacingError(
      { code: "SESSION_EXPIRED" },
      mockT({
        "errors.auth.SESSION_EXPIRED": "Session expired.",
      }),
    );

    assert.equal(message, "Session expired.");
  });

  it("maps EMAIL_SEND_FAILED to auth copy", () => {
    const message = getAuthUserFacingError(
      { code: "EMAIL_SEND_FAILED" },
      mockT({
        "errors.auth.EMAIL_SEND_FAILED": "Couldn’t send a sign-in email.",
      }),
    );

    assert.equal(message, "Couldn’t send a sign-in email.");
  });

  it("maps Better Auth 429 status without code to TOO_MANY_REQUESTS", () => {
    const message = getAuthUserFacingError(
      { status: 429 },
      mockT({
        "errors.auth.TOO_MANY_REQUESTS": "Too many sign-in emails.",
      }),
    );

    assert.equal(message, "Too many sign-in emails.");
  });

  it("maps catalog codes from Better Auth client wrappers", () => {
    const message = getAuthUserFacingError(
      { code: "bad_request" },
      mockT({
        "errors.api.bad_request": "Bad request.",
      }),
    );

    assert.equal(message, "Bad request.");
  });

  it("maps catalog internal_server_error from a query-param shaped error", () => {
    const message = getAuthUserFacingError(
      { code: "internal_server_error" },
      mockT({
        "errors.api.internal_server_error": "Something went wrong on our end. Please try again.",
      }),
    );

    assert.equal(message, "Something went wrong on our end. Please try again.");
  });

  it("maps oauth query-param code to auth copy", () => {
    const message = getAuthUserFacingError(
      { code: "oauth" },
      mockT({
        "errors.auth.oauth": "Couldn’t complete sign-in. Try again with email, GitHub, or LinkedIn.",
      }),
    );

    assert.equal(
      message,
      "Couldn’t complete sign-in. Try again with email, GitHub, or LinkedIn.",
    );
  });
});
