import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLastUsedMagicLink,
  isLastUsedOAuthProvider,
  isLastUsedPasskey,
  resolveExpoLastLoginMethod,
} from "./last-login-method.ts";

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
});

describe("resolveExpoLastLoginMethod", () => {
  it("maps magic-link verify, passkey verify, and OAuth callback paths", () => {
    assert.equal(
      resolveExpoLastLoginMethod("https://api.example/auth/magic-link/verify"),
      "magic-link",
    );
    assert.equal(
      resolveExpoLastLoginMethod("https://api.example/auth/passkey/verify-authentication"),
      "passkey",
    );
    assert.equal(resolveExpoLastLoginMethod("https://api.example/auth/callback/github"), "github");
    assert.equal(
      resolveExpoLastLoginMethod("https://api.example/auth/callback/linkedin"),
      "linkedin",
    );
  });

  it("returns null for unrelated auth paths", () => {
    assert.equal(resolveExpoLastLoginMethod("https://api.example/auth/sign-in/social"), null);
    assert.equal(resolveExpoLastLoginMethod("https://api.example/auth/get-session"), null);
  });
});
