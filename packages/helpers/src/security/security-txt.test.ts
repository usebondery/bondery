import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SUPPORT_EMAIL } from "../globals/paths.js";
import { BONDERY_PGP_PUBLIC_KEY } from "./pgp-public-key.js";
import { buildSecurityTxt } from "./security-txt.js";

describe("buildSecurityTxt", () => {
  const now = new Date("2026-08-31T12:00:00.000Z");
  const origin = "https://example.test";
  const body = buildSecurityTxt({ disclosureOrigin: `${origin}/`, now });

  it("uses mailto contact and 364-day UTC expiry", () => {
    assert.equal(body.includes(`Contact: mailto:${SUPPORT_EMAIL}`), true);
    assert.equal(body.includes("Expires: 2027-08-30T12:00:00.000Z"), true);
  });

  it("points Canonical, Policy, and Encryption at the given origin", () => {
    assert.equal(body.includes(`Canonical: ${origin}/.well-known/security.txt`), true);
    assert.equal(body.includes(`Policy: ${origin}/security`), true);
    assert.equal(body.includes(`Acknowledgments: ${origin}/security`), true);
    assert.equal(body.includes(`Encryption: ${origin}/.well-known/pgp-key.txt`), true);
  });

  it("ends with a trailing newline and has no Signed field", () => {
    assert.equal(body.endsWith("\n"), true);
    assert.equal(body.includes("Signed:"), false);
  });
});

describe("bondery pgp public key", () => {
  it("starts with a PGP public key armor header", () => {
    assert.equal(BONDERY_PGP_PUBLIC_KEY.startsWith("-----BEGIN PGP PUBLIC KEY BLOCK-----"), true);
  });
});
