import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SyncBatch } from "@bondery/schemas/sync";
import { collectAppliedSyncTables } from "./applied-tables.ts";

describe("collectAppliedSyncTables", () => {
  it("returns the unique materialized tables across pull batches", () => {
    const batches: SyncBatch[] = [
      {
        changes: [
          { entityId: "1", operation: "update", table: "people", value: {} },
          { entityId: "2", operation: "insert", table: "people_tags", value: {} },
        ],
        serverSequence: 1,
      },
      {
        changes: [{ entityId: "3", operation: "delete", table: "people", value: null }],
        serverSequence: 2,
      },
    ];

    assert.deepEqual(collectAppliedSyncTables(batches), ["people", "people_tags"]);
  });
});
