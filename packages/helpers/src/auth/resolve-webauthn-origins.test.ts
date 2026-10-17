import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAndroidSha256CertFingerprints,
  resolveWebAuthnAllowedOrigins,
  toAndroidApkKeyHashOrigin,
} from "./resolve-webauthn-origins.js";

const HOSTED_WEBAPP = "https://app.usebondery.com";
const HOSTED_WEBSITE = "https://usebondery.com";
const HOSTED_RP_ID = "usebondery.com";
const ZERO_FINGERPRINT =
  "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00";

describe("resolveWebAuthnAllowedOrigins", () => {
  it("includes the webapp origin and the native associated-domain website origin", () => {
    const origins = resolveWebAuthnAllowedOrigins({
      rpID: HOSTED_RP_ID,
      webappOrigin: HOSTED_WEBAPP,
      websiteUrl: HOSTED_WEBSITE,
    });
    assert.deepEqual(origins, [HOSTED_WEBAPP, HOSTED_WEBSITE]);
  });

  it("does not duplicate the webapp origin when the website URL is the same host", () => {
    const origins = resolveWebAuthnAllowedOrigins({
      rpID: HOSTED_RP_ID,
      webappOrigin: `${HOSTED_WEBAPP}/`,
      websiteUrl: `${HOSTED_WEBAPP}/`,
    });
    assert.deepEqual(origins, [HOSTED_WEBAPP]);
  });

  it("skips a localhost marketing site", () => {
    const origins = resolveWebAuthnAllowedOrigins({
      rpID: "localhost",
      webappOrigin: "http://localhost:26632",
      websiteUrl: "http://localhost:26630",
    });
    assert.deepEqual(origins, ["http://localhost:26632"]);
  });

  it("skips a website host that is not the rpID or a subdomain of it", () => {
    const origins = resolveWebAuthnAllowedOrigins({
      rpID: HOSTED_RP_ID,
      webappOrigin: HOSTED_WEBAPP,
      websiteUrl: "https://example.com",
    });
    assert.deepEqual(origins, [HOSTED_WEBAPP]);
  });

  it("includes a website subdomain of the rpID", () => {
    const origins = resolveWebAuthnAllowedOrigins({
      rpID: HOSTED_RP_ID,
      webappOrigin: HOSTED_WEBAPP,
      websiteUrl: "https://www.usebondery.com",
    });
    assert.ok(origins.includes("https://www.usebondery.com"));
  });

  it("appends Android apk-key-hash origins from fingerprints", () => {
    const origins = resolveWebAuthnAllowedOrigins({
      androidSha256Fingerprints: [ZERO_FINGERPRINT],
      rpID: HOSTED_RP_ID,
      webappOrigin: HOSTED_WEBAPP,
    });
    const apkOrigin = toAndroidApkKeyHashOrigin(ZERO_FINGERPRINT);
    assert.ok(apkOrigin);
    assert.ok(origins.includes(apkOrigin));
    assert.ok(apkOrigin.startsWith("android:apk-key-hash:"));
  });
});

describe("parseAndroidSha256CertFingerprints", () => {
  it("returns an empty list for missing or blank input", () => {
    assert.deepEqual(parseAndroidSha256CertFingerprints(undefined), []);
    assert.deepEqual(parseAndroidSha256CertFingerprints("  "), []);
  });

  it("normalizes colon-hex and drops invalid fragments", () => {
    const fingerprints = parseAndroidSha256CertFingerprints(
      ` ${ZERO_FINGERPRINT.toLowerCase()} , not-a-fingerprint, ${"AA".repeat(32)} `,
    );
    assert.deepEqual(fingerprints, [ZERO_FINGERPRINT, `${"AA:".repeat(31)}AA`]);
  });
});

describe("toAndroidApkKeyHashOrigin", () => {
  it("encodes SHA-256 bytes as base64url", () => {
    const origin = toAndroidApkKeyHashOrigin(ZERO_FINGERPRINT);
    assert.equal(
      origin,
      `android:apk-key-hash:${Buffer.from("00".repeat(32), "hex").toString("base64url")}`,
    );
  });

  it("returns null for an invalid fingerprint", () => {
    assert.equal(toAndroidApkKeyHashOrigin("deadbeef"), null);
  });
});
