import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAvatarUpdatedAtFromUrl } from "./avatar-clock.ts";

describe("parseAvatarUpdatedAtFromUrl", () => {
  it("recovers an ISO clock from the t= bust token", () => {
    const clock = "2026-03-01T00:00:00.000Z";
    const url = `https://storage.test/avatars/user/person.jpg?t=${Date.parse(clock)}`;
    assert.equal(parseAvatarUpdatedAtFromUrl(url), clock);
  });

  it("returns null when the URL has no bust token", () => {
    assert.equal(parseAvatarUpdatedAtFromUrl("https://storage.test/avatars/user/person.jpg"), null);
  });
});
