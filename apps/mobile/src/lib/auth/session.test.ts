import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AuthRequiredError,
  classifyTransportFailure,
  parseSessionTokenFromCookieHeader,
  resolveBootAuthGate,
} from "./session.ts";

describe("parseSessionTokenFromCookieHeader", () => {
  it("extracts better-auth.session_token", () => {
    assert.equal(
      parseSessionTokenFromCookieHeader("better-auth.session_token=opaque-token-1"),
      "opaque-token-1",
    );
  });

  it("extracts __Secure-better-auth.session_token", () => {
    assert.equal(
      parseSessionTokenFromCookieHeader("__Secure-better-auth.session_token=secure-token"),
      "secure-token",
    );
  });

  it("url-decodes the token value", () => {
    assert.equal(
      parseSessionTokenFromCookieHeader("better-auth.session_token=abc%2Fdef%3D"),
      "abc/def=",
    );
  });

  it("returns null for an empty header", () => {
    assert.equal(parseSessionTokenFromCookieHeader(""), null);
    assert.equal(parseSessionTokenFromCookieHeader("   "), null);
  });

  it("returns null when the session token is missing or blank", () => {
    assert.equal(parseSessionTokenFromCookieHeader("better-auth.session_data=cached"), null);
    assert.equal(parseSessionTokenFromCookieHeader("better-auth.session_token="), null);
  });

  it("decodes a fully percent-encoded header", () => {
    assert.equal(
      parseSessionTokenFromCookieHeader("better-auth.session_token%3Dencoded-token"),
      "encoded-token",
    );
  });
});

describe("resolveBootAuthGate", () => {
  it("keeps splash until the local credential is known", () => {
    assert.deepEqual(
      resolveBootAuthGate({
        cookieReadTimedOut: false,
        cookieToken: undefined,
        isAuthenticated: false,
      }),
      { hasLocalCredential: false, isReady: false },
    );
  });

  it("enters the app when a cached session exists", () => {
    assert.deepEqual(
      resolveBootAuthGate({
        cookieReadTimedOut: false,
        cookieToken: undefined,
        isAuthenticated: true,
      }),
      { hasLocalCredential: true, isReady: true },
    );
  });

  it("enters the app when a cookie token exists", () => {
    assert.deepEqual(
      resolveBootAuthGate({
        cookieReadTimedOut: false,
        cookieToken: "opaque-token",
        isAuthenticated: false,
      }),
      { hasLocalCredential: true, isReady: true },
    );
  });

  it("shows login after an empty cookie read", () => {
    assert.deepEqual(
      resolveBootAuthGate({
        cookieReadTimedOut: false,
        cookieToken: null,
        isAuthenticated: false,
      }),
      { hasLocalCredential: false, isReady: true },
    );
  });

  it("does not show login on timeout while a session exists", () => {
    assert.deepEqual(
      resolveBootAuthGate({
        cookieReadTimedOut: true,
        cookieToken: undefined,
        isAuthenticated: true,
      }),
      { hasLocalCredential: true, isReady: true },
    );
  });
});

describe("classifyTransportFailure", () => {
  it("classifies AuthRequiredError reasons", () => {
    assert.equal(
      classifyTransportFailure(new AuthRequiredError("missing_local_session")),
      "missing_local_session",
    );
    assert.equal(
      classifyTransportFailure(new AuthRequiredError("session_revoked")),
      "session_revoked",
    );
  });

  it("classifies abort, 401, 426, and network failures", () => {
    const aborted = new Error("Aborted");
    aborted.name = "AbortError";
    assert.equal(classifyTransportFailure(aborted), "aborted");

    const revoked = new Error("unauthorized");
    (revoked as Error & { status: number }).status = 401;
    assert.equal(classifyTransportFailure(revoked), "session_revoked");

    const mismatch = new Error("upgrade required");
    (mismatch as Error & { status: number }).status = 426;
    assert.equal(classifyTransportFailure(mismatch), "protocol_mismatch");

    assert.equal(classifyTransportFailure(new Error("ECONNRESET")), "network");
  });
});
