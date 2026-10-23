import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  type AvatarFileRow,
  type AvatarFs,
  decideAvatarFileAction,
  notePeopleAvatarDelete,
  notePeopleAvatarUpsert,
  resetPendingAvatarJobsForTests,
  runAvatarFileQueue,
} from "./avatar-file-queue.ts";

function createMemoryAvatarFs(): AvatarFs & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    async copyFromUri(personId, sourceUri) {
      files.set(personId, sourceUri);
    },
    deleteDir() {
      files.clear();
    },
    deleteFile(personId) {
      files.delete(personId);
    },
    async download(personId, url) {
      files.set(personId, url);
    },
    fileExists(personId) {
      return files.has(personId);
    },
    files,
    fileUri(personId) {
      return files.has(personId) ? `file://${personId}.jpg` : null;
    },
  };
}

function createMemoryAvatarDb(rows: AvatarFileRow[]) {
  const byId = new Map(rows.map((row) => [row.id, { ...row }]));

  return {
    getAllSync(_sql: string, ...params: unknown[]) {
      return params
        .map((id) => byId.get(String(id)))
        .filter((row): row is AvatarFileRow => Boolean(row));
    },
    rows: byId,
    runSync(sql: string, ...params: unknown[]) {
      if (sql.includes("avatar_local_updated_at")) {
        const clock = (params[0] as string | null) ?? null;
        const personId = String(params[1]);
        const row = byId.get(personId);
        if (row) {
          row.avatar_local_updated_at = clock;
        }
      }
    },
  };
}

describe("decideAvatarFileAction", () => {
  it("downloads when the file is missing", () => {
    assert.equal(
      decideAvatarFileAction({
        avatarLocalUpdatedAt: "2026-01-01T00:00:00.000Z",
        avatarUpdatedAt: "2026-01-01T00:00:00.000Z",
        fileExists: false,
        hasAvatar: true,
      }),
      "download",
    );
  });

  it("downloads when the server clock is newer than the local clock", () => {
    assert.equal(
      decideAvatarFileAction({
        avatarLocalUpdatedAt: "2026-01-01T00:00:00.000Z",
        avatarUpdatedAt: "2026-02-01T00:00:00.000Z",
        fileExists: true,
        hasAvatar: true,
      }),
      "download",
    );
  });

  it("keeps a matching local file", () => {
    assert.equal(
      decideAvatarFileAction({
        avatarLocalUpdatedAt: "2026-01-01T00:00:00.000Z",
        avatarUpdatedAt: "2026-01-01T00:00:00.000Z",
        fileExists: true,
        hasAvatar: true,
      }),
      "keep",
    );
  });

  it("deletes the file when hasAvatar is false", () => {
    assert.equal(
      decideAvatarFileAction({
        avatarLocalUpdatedAt: "2026-01-01T00:00:00.000Z",
        avatarUpdatedAt: null,
        fileExists: true,
        hasAvatar: false,
      }),
      "delete",
    );
  });
});

describe("runAvatarFileQueue", () => {
  afterEach(() => {
    resetPendingAvatarJobsForTests();
  });

  it("downloads only missing or stale files and skips current files", async () => {
    const fs = createMemoryAvatarFs();
    fs.files.set("current", "existing");
    const db = createMemoryAvatarDb([
      {
        avatar_local_updated_at: null,
        avatar_updated_at: "2026-01-01T00:00:00.000Z",
        has_avatar: 1,
        id: "missing",
        user_id: "user-1",
      },
      {
        avatar_local_updated_at: "2026-01-01T00:00:00.000Z",
        avatar_updated_at: "2026-02-01T00:00:00.000Z",
        has_avatar: 1,
        id: "stale",
        user_id: "user-1",
      },
      {
        avatar_local_updated_at: "2026-01-01T00:00:00.000Z",
        avatar_updated_at: "2026-01-01T00:00:00.000Z",
        has_avatar: 1,
        id: "current",
        user_id: "user-1",
      },
    ]);

    notePeopleAvatarUpsert("missing");
    notePeopleAvatarUpsert("stale");
    notePeopleAvatarUpsert("current");

    await runAvatarFileQueue({
      db,
      fs,
      resolveRemoteUrl: (_userId, personId) => `https://storage.test/avatars/${personId}.jpg`,
    });

    assert.equal(fs.files.has("missing"), true);
    assert.equal(fs.files.has("stale"), true);
    assert.equal(fs.files.get("current"), "existing");
    assert.equal(db.rows.get("missing")?.avatar_local_updated_at, "2026-01-01T00:00:00.000Z");
    assert.equal(db.rows.get("stale")?.avatar_local_updated_at, "2026-02-01T00:00:00.000Z");
  });

  it("deletes the local file when the person is deleted", async () => {
    const fs = createMemoryAvatarFs();
    fs.files.set("gone", "existing");

    notePeopleAvatarDelete("gone");
    await runAvatarFileQueue({
      db: createMemoryAvatarDb([]),
      fs,
      resolveRemoteUrl: () => null,
    });

    assert.equal(fs.files.has("gone"), false);
  });
});
