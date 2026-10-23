import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { PrismaClient } from "@bondery/db";
import { createMemoryStorage } from "../../test/memory-storage.js";
import {
  AVATARS_BUCKET,
  resetStorageForTests,
  setStorageForTests,
} from "../storage/get-storage.js";
import {
  areContactAvatarFilesIdentical,
  getContactAvatarStoragePath,
  setContactHasAvatar,
} from "./avatar-storage.js";

const USER_ID = "user-1";
const LEFT_ID = "11111111-1111-4111-8111-111111111111";
const RIGHT_ID = "22222222-2222-4222-8222-222222222222";

describe("areContactAvatarFilesIdentical", () => {
  afterEach(() => {
    resetStorageForTests();
  });

  it("is false when either avatar file is missing", async () => {
    const storage = createMemoryStorage();
    setStorageForTests(storage);
    await storage.put(
      AVATARS_BUCKET,
      getContactAvatarStoragePath(USER_ID, LEFT_ID),
      Buffer.from("jpeg-a"),
    );

    assert.equal(await areContactAvatarFilesIdentical(USER_ID, LEFT_ID, RIGHT_ID), false);
  });

  it("is false when the files differ", async () => {
    const storage = createMemoryStorage();
    setStorageForTests(storage);
    await storage.put(
      AVATARS_BUCKET,
      getContactAvatarStoragePath(USER_ID, LEFT_ID),
      Buffer.from("jpeg-a"),
    );
    await storage.put(
      AVATARS_BUCKET,
      getContactAvatarStoragePath(USER_ID, RIGHT_ID),
      Buffer.from("jpeg-b"),
    );

    assert.equal(await areContactAvatarFilesIdentical(USER_ID, LEFT_ID, RIGHT_ID), false);
  });

  it("is true when both files have the same bytes", async () => {
    const storage = createMemoryStorage();
    setStorageForTests(storage);
    const bytes = Buffer.from("jpeg-same");
    await storage.put(AVATARS_BUCKET, getContactAvatarStoragePath(USER_ID, LEFT_ID), bytes);
    await storage.put(
      AVATARS_BUCKET,
      getContactAvatarStoragePath(USER_ID, RIGHT_ID),
      Buffer.from(bytes),
    );

    assert.equal(await areContactAvatarFilesIdentical(USER_ID, LEFT_ID, RIGHT_ID), true);
  });
});

describe("setContactHasAvatar", () => {
  it("sets avatarUpdatedAt when hasAvatar is true", async () => {
    const calls: unknown[] = [];
    const db = {
      people: {
        updateMany: async (args: unknown) => {
          calls.push(args);
        },
      },
    };

    await setContactHasAvatar(db as PrismaClient, USER_ID, LEFT_ID, true);

    const data = (calls[0] as { data: { hasAvatar: boolean; avatarUpdatedAt: Date | null } }).data;
    assert.equal(data.hasAvatar, true);
    assert.equal(data.avatarUpdatedAt instanceof Date, true);
  });

  it("clears avatarUpdatedAt when hasAvatar is false", async () => {
    const calls: unknown[] = [];
    const db = {
      people: {
        updateMany: async (args: unknown) => {
          calls.push(args);
        },
      },
    };

    await setContactHasAvatar(db as PrismaClient, USER_ID, LEFT_ID, false);

    const data = (calls[0] as { data: { hasAvatar: boolean; avatarUpdatedAt: Date | null } }).data;
    assert.equal(data.hasAvatar, false);
    assert.equal(data.avatarUpdatedAt, null);
  });
});
