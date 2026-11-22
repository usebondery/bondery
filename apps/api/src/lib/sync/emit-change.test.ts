import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PrismaClient } from "@bondery/db";
import type { SyncChange } from "@bondery/schemas/sync";
import { emitSyncBatch } from "./emit-change.js";

describe("emitSyncBatch", () => {
  it("writes multiple changelog rows under one server sequence", async () => {
    const inserted: Record<string, unknown>[] = [];
    const db = {
      $queryRaw: async () => [{ allocate_sync_server_sequence: 7n }],
      syncChangeLog: {
        createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
          inserted.push(...data);
          return { count: data.length };
        },
      },
    };

    const changes: SyncChange[] = [
      { entityId: "person-1", operation: "update", table: "people", value: { id: "person-1" } },
      { entityId: "group-1", operation: "update", table: "groups", value: { id: "group-1" } },
    ];

    const serverSequence = await emitSyncBatch(
      "11111111-1111-4111-8111-111111111111",
      changes,
      undefined,
      db as unknown as PrismaClient,
    );

    assert.equal(serverSequence, 7);
    assert.equal(inserted.length, 2);
    assert.equal(inserted[0]?.serverSequence, 7n);
    assert.equal(inserted[1]?.serverSequence, 7n);
    assert.equal(inserted[0]?.changeIndex, 0);
    assert.equal(inserted[1]?.changeIndex, 1);
  });
});
