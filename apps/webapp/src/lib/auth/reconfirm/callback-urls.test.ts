import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReconfirmCallbackUrl,
  buildReconfirmMagicLinkUrls,
  buildReconfirmSettingsUrl,
} from "./callback-urls.js";

const ORIGIN = "https://app.usebondery.com";
const REVOKE_KEY_ID = "11111111-1111-4111-8111-111111111111";

describe("buildReconfirmMagicLinkUrls", () => {
  it("returns confirm URLs with has_returned=1 and never uses /auth/start or /login", () => {
    const urls = buildReconfirmMagicLinkUrls(ORIGIN, "add_passkey");
    assert.equal(urls.callbackURL, `${ORIGIN}/confirm?action=add_passkey&has_returned=1`);
    assert.equal(urls.errorCallbackURL, urls.callbackURL);
    assert.doesNotMatch(urls.callbackURL, /\/auth\/start/);
    assert.doesNotMatch(urls.errorCallbackURL, /\/auth\/start/);
    assert.doesNotMatch(urls.callbackURL, /\/login/);
    assert.doesNotMatch(urls.errorCallbackURL, /\/login/);
  });

  it("keeps unlink, delete, and revoke target on the confirm query", () => {
    assert.equal(
      buildReconfirmCallbackUrl(ORIGIN, "unlink_github"),
      `${ORIGIN}/confirm?action=unlink_github`,
    );
    assert.equal(
      buildReconfirmCallbackUrl(ORIGIN, "delete_account"),
      `${ORIGIN}/confirm?action=delete_account`,
    );
    assert.equal(
      buildReconfirmCallbackUrl(ORIGIN, "revoke_api_key", REVOKE_KEY_ID),
      `${ORIGIN}/confirm?action=revoke_api_key&target=${REVOKE_KEY_ID}`,
    );
    assert.equal(
      buildReconfirmCallbackUrl(ORIGIN, "revoke_mcp_consent", "not-a-uuid"),
      `${ORIGIN}/confirm?action=revoke_mcp_consent`,
    );
    assert.equal(
      buildReconfirmMagicLinkUrls(ORIGIN, "revoke_api_key", REVOKE_KEY_ID).callbackURL,
      `${ORIGIN}/confirm?action=revoke_api_key&target=${REVOKE_KEY_ID}&has_returned=1`,
    );
    assert.equal(
      buildReconfirmCallbackUrl(ORIGIN, "delete_account", null, { hasReturned: true }),
      `${ORIGIN}/confirm?action=delete_account&has_returned=1`,
    );
  });

  it("builds settings return URLs without has_returned", () => {
    assert.equal(
      buildReconfirmSettingsUrl(ORIGIN, "add_passkey"),
      `${ORIGIN}/app/settings?action=add_passkey`,
    );
    assert.equal(
      buildReconfirmSettingsUrl(ORIGIN, "revoke_api_key", REVOKE_KEY_ID),
      `${ORIGIN}/app/settings?action=revoke_api_key&target=${REVOKE_KEY_ID}`,
    );
    assert.doesNotMatch(buildReconfirmSettingsUrl(ORIGIN, "delete_account"), /has_returned=/);
    assert.doesNotMatch(buildReconfirmSettingsUrl(ORIGIN, "delete_account"), /\/auth\/start/);
    assert.doesNotMatch(buildReconfirmSettingsUrl(ORIGIN, "delete_account"), /\/login/);
  });
});
