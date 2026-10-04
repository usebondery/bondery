import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isReconfirmPurpose,
  parseConfirmTarget,
  parseHasReturned,
  parseReconfirmPurpose,
  RECONFIRM_PURPOSES,
  stripReconfirmSearchParam,
} from "./purposes.js";

describe("reconfirm purpose allowlist", () => {
  it("accepts only the closed purpose list", () => {
    for (const purpose of RECONFIRM_PURPOSES) {
      assert.equal(isReconfirmPurpose(purpose), true);
      assert.equal(parseReconfirmPurpose(purpose), purpose);
    }

    assert.equal(parseReconfirmPurpose("login"), null);
    assert.equal(parseReconfirmPurpose("delete"), null);
    assert.equal(parseReconfirmPurpose(""), null);
    assert.equal(parseReconfirmPurpose(null), null);
    assert.equal(
      parseConfirmTarget("11111111-1111-4111-8111-111111111111"),
      "11111111-1111-4111-8111-111111111111",
    );
    assert.equal(parseConfirmTarget("not-a-uuid"), null);
    assert.equal(parseConfirmTarget(null), null);
    assert.equal(parseHasReturned("1"), true);
    assert.equal(parseHasReturned("true"), false);
    assert.equal(parseHasReturned(null), false);
  });

  it("strips known and unknown reconfirm params from the settings URL", () => {
    assert.equal(stripReconfirmSearchParam("/app/settings?action=add_passkey"), "/app/settings");
    assert.equal(
      stripReconfirmSearchParam("/app/settings?action=not_a_purpose&tab=profile"),
      "/app/settings?tab=profile",
    );
    assert.equal(
      stripReconfirmSearchParam(
        "/app/settings?action=revoke_api_key&target=11111111-1111-4111-8111-111111111111",
      ),
      "/app/settings",
    );
    assert.equal(
      stripReconfirmSearchParam("https://app.usebondery.com/app/settings?action=delete_account"),
      "/app/settings",
    );
    assert.equal(
      stripReconfirmSearchParam("/app/settings?action=add_passkey&has_returned=1"),
      "/app/settings",
    );
    assert.equal(
      stripReconfirmSearchParam("/confirm?action=delete_account&has_returned=1"),
      "/confirm",
    );
  });
});
