import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  displayNameFromLinkedInHandle,
  looksLikeLinkedInVanityHandle,
  parseFsdProfileUrnFromComponentKey,
} from "./sduiProfile";

describe("parseFsdProfileUrnFromComponentKey", () => {
  it("reads the ACo id before an SDUI section suffix", () => {
    assert.equal(
      parseFsdProfileUrnFromComponentKey(
        "profile-component-refACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDswTopcard",
      ),
      "urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
    );
  });

  it("reads an embedded fsd_profile URN", () => {
    assert.equal(
      parseFsdProfileUrnFromComponentKey(
        "entity-urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
      ),
      "urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
    );
  });

  it("reads a bare ACo token when there is no section suffix", () => {
    assert.equal(
      parseFsdProfileUrnFromComponentKey("ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw"),
      "urn:li:fsd_profile:ACoAAABbCU8BZ1u7ldnivR0qeqOY0lnnhiyUDsw",
    );
  });

  it("returns null for empty or unrelated keys", () => {
    assert.equal(parseFsdProfileUrnFromComponentKey(null), null);
    assert.equal(parseFsdProfileUrnFromComponentKey(""), null);
    assert.equal(parseFsdProfileUrnFromComponentKey("TopcardOnly"), null);
  });
});

describe("looksLikeLinkedInVanityHandle", () => {
  it("treats the profile URL slug as a handle, not a name", () => {
    assert.equal(
      looksLikeLinkedInVanityHandle("jakub-žemlička-50779a201", "jakub-žemlička-50779a201"),
      true,
    );
  });

  it("does not flag a real display name", () => {
    assert.equal(
      looksLikeLinkedInVanityHandle("Jakub Žemlička", "jakub-žemlička-50779a201"),
      false,
    );
  });

  it("does not flag hyphenated given names", () => {
    assert.equal(looksLikeLinkedInVanityHandle("Jean-Pierre"), false);
  });
});

describe("displayNameFromLinkedInHandle", () => {
  it("splits a unicode vanity slug and drops the LinkedIn hash", () => {
    assert.deepEqual(displayNameFromLinkedInHandle("jakub-žemlička-50779a201"), {
      firstName: "Jakub",
      lastName: "Žemlička",
    });
  });

  it("returns null for a single-token custom vanity", () => {
    assert.equal(displayNameFromLinkedInHandle("jakubzemlicka"), null);
  });
});
