import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapInteractionParticipant } from "./format.js";

describe("mapInteractionParticipant", () => {
  it("carries the hover-card display lines", () => {
    const participant = mapInteractionParticipant("user-a", {
      avatarUpdatedAt: null,
      firstName: "Ada",
      hasAvatar: false,
      headline: "Mathematician",
      id: "person-1",
      lastName: "Lovelace",
      location: "London, UK",
      middleName: "Augusta",
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    assert.equal(participant.headline, "Mathematician");
    assert.equal(participant.location, "London, UK");
    assert.equal(participant.middleName, "Augusta");
    assert.equal(participant.updatedAt, "2026-03-01T00:00:00.000Z");
  });

  it("keeps nullable display lines as null", () => {
    const participant = mapInteractionParticipant("user-a", {
      avatarUpdatedAt: null,
      firstName: "Grace",
      hasAvatar: false,
      headline: null,
      id: "person-2",
      lastName: null,
      location: null,
      middleName: null,
      updatedAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    assert.equal(participant.headline, null);
    assert.equal(participant.location, null);
    assert.equal(participant.middleName, null);
    assert.equal(participant.lastName, null);
  });
});
