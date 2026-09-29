import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNativeLoopbackHttpRedirectUri,
  rewriteDcrRegistrationBody,
} from "./rewrite-dcr-registration-body.js";

describe("rewriteDcrRegistrationBody", () => {
  it("treats Cursor localhost HTTP callbacks as native loopback", () => {
    assert.equal(isNativeLoopbackHttpRedirectUri("http://localhost:8787/callback"), true);
    assert.equal(isNativeLoopbackHttpRedirectUri("http://127.0.0.1:8787/callback"), true);
    assert.equal(isNativeLoopbackHttpRedirectUri("https://localhost:8787/callback"), false);
    assert.equal(isNativeLoopbackHttpRedirectUri("http://example.com/callback"), false);
  });

  it("sets application_type native when Cursor omits it", () => {
    assert.deepEqual(
      rewriteDcrRegistrationBody({
        client_name: "Cursor",
        redirect_uris: ["http://localhost:8787/callback"],
        token_endpoint_auth_method: "none",
      }),
      {
        application_type: "native",
        client_name: "Cursor",
        redirect_uris: ["http://localhost:8787/callback"],
        token_endpoint_auth_method: "none",
      },
    );
  });

  it("overrides application_type web for loopback HTTP", () => {
    const rewritten = rewriteDcrRegistrationBody({
      application_type: "web",
      redirect_uris: ["http://127.0.0.1:8787/callback"],
    }) as { application_type?: string };
    assert.equal(rewritten.application_type, "native");
  });

  it("does not rewrite non-loopback HTTP redirects", () => {
    const body = {
      application_type: "web",
      redirect_uris: ["http://example.com/callback"],
    };
    assert.equal(rewriteDcrRegistrationBody(body), body);
  });
});
