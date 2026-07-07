import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syncWakeEventFromChanges } from "./emit-change.js";

describe("syncWakeEventFromChanges", () => {
  it("deduplicates affected tables and includes source device", () => {
    const event = syncWakeEventFromChanges(
      12,
      [
        { table: "people", operation: "update", entityId: "a", value: {} },
        { table: "people_tags", operation: "insert", entityId: "b", value: {} },
        { table: "people", operation: "update", entityId: "c", value: {} },
      ],
      { sourceDeviceId: "device-1" },
    );

    assert.equal(event.serverSequence, 12);
    assert.deepEqual(event.affectedTables.toSorted(), ["people", "people_tags"]);
    assert.equal(event.sourceDeviceId, "device-1");
  });

  it("omits sourceDeviceId when not provided", () => {
    const event = syncWakeEventFromChanges(3, [
      { table: "tags", operation: "delete", entityId: "x", value: null },
    ]);

    assert.equal(event.sourceDeviceId, undefined);
    assert.deepEqual(event.affectedTables, ["tags"]);
  });
});
