import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTH_SCHEME,
  buildNativeAuthDeepLink,
  nativeAuthDeepLink,
} from "./native-auth-deep-link.ts";

describe("buildNativeAuthDeepLink", () => {
  it("builds a custom-scheme URL from a relative path", () => {
    assert.equal(buildNativeAuthDeepLink("bondery", "auth/callback"), "bondery://auth/callback");
    assert.equal(buildNativeAuthDeepLink("bondery", "/login"), "bondery://login");
  });
});

describe("nativeAuthDeepLink", () => {
  it("uses the app scheme so Better Auth can attach the session cookie", () => {
    assert.equal(AUTH_SCHEME, "bondery");
    assert.equal(nativeAuthDeepLink("auth/callback"), "bondery://auth/callback");
    assert.equal(nativeAuthDeepLink("/login"), "bondery://login");
  });
});
