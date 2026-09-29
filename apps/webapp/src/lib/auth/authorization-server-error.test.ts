import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOAuthAuthorizationServerError,
  resolveAuthorizationServerErrorHref,
  searchStringFromNextParams,
} from "./authorization-server-error.js";

describe("isOAuthAuthorizationServerError", () => {
  it("recognizes authorize-endpoint errors that cannot use redirect_uri", () => {
    assert.equal(isOAuthAuthorizationServerError("invalid_redirect"), true);
    assert.equal(isOAuthAuthorizationServerError("invalid_client"), true);
  });

  it("leaves webapp IdP and magic-link errors on /login", () => {
    assert.equal(isOAuthAuthorizationServerError("INVALID_TOKEN"), false);
    assert.equal(isOAuthAuthorizationServerError("internal_server_error"), false);
    assert.equal(isOAuthAuthorizationServerError("access_denied"), false);
    assert.equal(isOAuthAuthorizationServerError(null), false);
  });
});

describe("resolveAuthorizationServerErrorHref", () => {
  it("sends invalid_redirect to the AS login door with the error query intact", () => {
    assert.equal(
      resolveAuthorizationServerErrorHref({
        error: "invalid_redirect",
        error_description: "invalid redirect uri",
      }),
      "/oauth/login?error=invalid_redirect&error_description=invalid+redirect+uri",
    );
  });

  it("does not intercept ordinary login errors", () => {
    assert.equal(resolveAuthorizationServerErrorHref({ error: "INVALID_TOKEN" }), null);
    assert.equal(resolveAuthorizationServerErrorHref({}), null);
  });
});

describe("searchStringFromNextParams", () => {
  it("serializes repeated Next.js search values", () => {
    assert.equal(
      searchStringFromNextParams({ ba_param: ["client_id", "sig"], client_id: "ext" }),
      "?ba_param=client_id&ba_param=sig&client_id=ext",
    );
  });
});
