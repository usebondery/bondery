import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createMemoryStorage } from "../../test/memory-storage.js";
import { resolveContactAvatarUrl } from "./avatar-urls.js";
import { resetStorageForTests, setStorageForTests } from "./get-storage.js";

const USER_ID = "user-1";
const PERSON_ID = "person-1";

describe("resolveContactAvatarUrl", () => {
  afterEach(() => {
    resetStorageForTests();
  });

  it("busts with avatarUpdatedAt, not people.updatedAt", () => {
    setStorageForTests(createMemoryStorage());
    const avatarUpdatedAt = new Date("2026-03-01T00:00:00.000Z");
    const updatedAt = new Date("2026-06-01T00:00:00.000Z");

    const url = resolveContactAvatarUrl(USER_ID, {
      avatarUpdatedAt,
      hasAvatar: true,
      id: PERSON_ID,
    });

    assert.ok(url);
    assert.equal(url.includes(`t=${avatarUpdatedAt.getTime()}`), true);
    assert.equal(url.includes(`t=${updatedAt.getTime()}`), false);
  });

  it("returns null when hasAvatar is false", () => {
    setStorageForTests(createMemoryStorage());
    const url = resolveContactAvatarUrl(USER_ID, {
      avatarUpdatedAt: new Date("2026-03-01T00:00:00.000Z"),
      hasAvatar: false,
      id: PERSON_ID,
    });
    assert.equal(url, null);
  });
});
