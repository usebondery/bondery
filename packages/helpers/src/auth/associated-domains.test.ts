import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAndroidAssetLinks,
  buildAppleAppSiteAssociation,
  MOBILE_APP_PACKAGE_ID,
} from "./associated-domains.js";

const TEAM_ID = "ABCDE12345";
const ZERO_FINGERPRINT =
  "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00";

describe("buildAppleAppSiteAssociation", () => {
  it("returns null when the team id is missing", () => {
    assert.equal(buildAppleAppSiteAssociation({ teamId: undefined }), null);
    assert.equal(buildAppleAppSiteAssociation({ teamId: "  " }), null);
  });

  it("returns null when the team id is not 10 alphanumeric characters", () => {
    assert.equal(buildAppleAppSiteAssociation({ teamId: "SHORT" }), null);
    assert.equal(buildAppleAppSiteAssociation({ teamId: "not_valid!" }), null);
  });

  it("builds webcredentials and applinks for the mobile package", () => {
    const document = buildAppleAppSiteAssociation({ teamId: TEAM_ID.toLowerCase() });
    assert.deepEqual(document, {
      applinks: {
        apps: [],
        details: [{ appID: `${TEAM_ID}.${MOBILE_APP_PACKAGE_ID}`, paths: ["*"] }],
      },
      webcredentials: {
        apps: [`${TEAM_ID}.${MOBILE_APP_PACKAGE_ID}`],
      },
    });
  });
});

describe("buildAndroidAssetLinks", () => {
  it("returns null when no valid fingerprint is configured", () => {
    assert.equal(buildAndroidAssetLinks({ fingerprintsCsv: undefined }), null);
    assert.equal(buildAndroidAssetLinks({ fingerprintsCsv: "nope" }), null);
  });

  it("builds Digital Asset Links for App Links and passkeys", () => {
    const links = buildAndroidAssetLinks({ fingerprintsCsv: ZERO_FINGERPRINT });
    assert.deepEqual(links, [
      {
        relation: [
          "delegate_permission/common.handle_all_urls",
          "delegate_permission/common.get_login_creds",
        ],
        target: {
          namespace: "android_app",
          package_name: MOBILE_APP_PACKAGE_ID,
          sha256_cert_fingerprints: [ZERO_FINGERPRINT],
        },
      },
    ]);
  });
});
