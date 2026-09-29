import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLastUsedMagicLink,
  isLastUsedOAuthProvider,
  isLastUsedPasskey,
  isMagicLinkVerifyErrorCode,
  resolveAnalyticsLoginMethod,
} from "./last-login-method.js";

describe("last login method matching", () => {
  it("matches github and linkedin callback ids from lastLoginMethod", () => {
    assert.equal(isLastUsedOAuthProvider("github", "github"), true);
    assert.equal(isLastUsedOAuthProvider("linkedin", "linkedin"), true);
    assert.equal(isLastUsedOAuthProvider("linkedin_oidc", "linkedin"), true);
    assert.equal(isLastUsedOAuthProvider("github", "linkedin"), false);
  });

  it("matches passkey from verify-authentication", () => {
    assert.equal(isLastUsedPasskey("passkey"), true);
    assert.equal(isLastUsedPasskey("github"), false);
  });

  it("matches magic-link from verify", () => {
    assert.equal(isLastUsedMagicLink("magic-link"), true);
    assert.equal(isLastUsedMagicLink("passkey"), false);
  });

  it("maps analytics login_method without PII", () => {
    assert.equal(resolveAnalyticsLoginMethod("magic-link"), "email");
    assert.equal(resolveAnalyticsLoginMethod("passkey"), "passkey");
    assert.equal(resolveAnalyticsLoginMethod("github"), "oauth_github");
    assert.equal(resolveAnalyticsLoginMethod("linkedin"), "oauth_linkedin");
    assert.equal(resolveAnalyticsLoginMethod(null), undefined);
  });

  it("recognizes magic-link verify error codes", () => {
    assert.equal(isMagicLinkVerifyErrorCode("INVALID_TOKEN"), true);
    assert.equal(isMagicLinkVerifyErrorCode("TOKEN_EXPIRED"), true);
    assert.equal(isMagicLinkVerifyErrorCode("oauth"), false);
    assert.equal(isMagicLinkVerifyErrorCode("internal_server_error"), false);
    assert.equal(isMagicLinkVerifyErrorCode(null), false);
  });
});
