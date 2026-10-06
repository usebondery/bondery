import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLinkedInUsernameFromPathname,
  linkedInHandlesMatch,
  linkedInProfileUrl,
  normalizeLinkedInVanityHandle,
} from "./handle";

describe("normalizeLinkedInVanityHandle", () => {
  it("decodes a percent-encoded slug and NFC-normalises it", () => {
    assert.equal(
      normalizeLinkedInVanityHandle("jakub-%C5%BEemli%C4%8Dka-50779a201"),
      "jakub-žemlička-50779a201",
    );
  });

  it("extracts the vanity from a full profile URL", () => {
    assert.equal(
      normalizeLinkedInVanityHandle("https://www.linkedin.com/in/jakub-žemlička-50779a201/"),
      "jakub-žemlička-50779a201",
    );
  });

  it("treats NFC and NFD unicode as the same handle", () => {
    const nfc = "jakub-žemlička-50779a201";
    const nfd = nfc.normalize("NFD");
    assert.notEqual(nfc, nfd);
    assert.equal(normalizeLinkedInVanityHandle(nfd), nfc.normalize("NFC"));
  });
});

describe("linkedInHandlesMatch", () => {
  it("matches an encoded stored handle to a live pathname slug", () => {
    assert.equal(
      linkedInHandlesMatch("jakub-%C5%BEemli%C4%8Dka-50779a201", "jakub-žemlička-50779a201"),
      true,
    );
  });

  it("matches NFC against NFD", () => {
    const nfc = "jakub-žemlička-50779a201";
    assert.equal(linkedInHandlesMatch(nfc, nfc.normalize("NFD")), true);
  });
});

describe("getLinkedInUsernameFromPathname", () => {
  it("reads a clean /in/{handle}/ path", () => {
    assert.equal(
      getLinkedInUsernameFromPathname("/in/jakub-žemlička-50779a201/"),
      "jakub-žemlička-50779a201",
    );
  });

  it("reads extra path segments after the vanity", () => {
    assert.equal(
      getLinkedInUsernameFromPathname("/in/ada-lovelace/overlay/contact-info/"),
      "ada-lovelace",
    );
  });

  it("returns null when the path is not a profile", () => {
    assert.equal(getLinkedInUsernameFromPathname("/feed/"), null);
  });
});

describe("linkedInProfileUrl", () => {
  it("encodes a unicode vanity for tabs.create", () => {
    assert.equal(
      linkedInProfileUrl("jakub-žemlička-50779a201"),
      "https://www.linkedin.com/in/jakub-%C5%BEemli%C4%8Dka-50779a201/",
    );
  });
});
