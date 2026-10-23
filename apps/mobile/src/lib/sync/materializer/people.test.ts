import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { SQLiteDatabase } from "expo-sqlite";
import { resetPendingAvatarJobsForTests } from "../avatar-file-queue.ts";
import { applyPeopleShapeOp, PEOPLE_UPSERT_SQL } from "./people.ts";

describe("PEOPLE_UPSERT_SQL", () => {
  it("writes avatar_updated_at from the server and preserves avatar_local_updated_at", () => {
    assert.equal(
      PEOPLE_UPSERT_SQL.includes("avatar_updated_at = excluded.avatar_updated_at"),
      true,
    );
    assert.equal(PEOPLE_UPSERT_SQL.includes("avatar_local_updated_at = excluded"), false);
    assert.match(PEOPLE_UPSERT_SQL, /avatar_updated_at, avatar_local_updated_at/);
    assert.match(PEOPLE_UPSERT_SQL, /\?, \?, NULL, \?/);
  });
});

describe("applyPeopleShapeOp", () => {
  afterEach(() => {
    resetPendingAvatarJobsForTests();
  });

  it("does not bind avatar_local_updated_at from the server payload", () => {
    const statements: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      runSync(sql: string, ...params: unknown[]) {
        statements.push({ params, sql });
      },
    } as unknown as SQLiteDatabase;

    applyPeopleShapeOp(db, {
      operation: "update",
      value: {
        avatar_local_updated_at: "should-not-write",
        avatar_updated_at: "2026-02-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        first_name: "Ada",
        has_avatar: 1,
        id: "person-1",
        updated_at: "2026-03-01T00:00:00.000Z",
        user_id: "user-1",
      },
    });

    assert.equal(statements.length, 1);
    assert.equal(statements[0]?.params.includes("should-not-write"), false);
    assert.equal(statements[0]?.params.includes("2026-02-01T00:00:00.000Z"), true);
  });
});
