import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syncWakeEventFromChanges } from "./emit-change.js";

describe("syncWakeEventFromChanges", () => {
  it("deduplicates affected tables and includes source device", () => {
    const event = syncWakeEventFromChanges(
      12,
      [
        { entityId: "a", operation: "update", table: "people", value: {} },
        { entityId: "b", operation: "insert", table: "people_tags", value: {} },
        { entityId: "c", operation: "update", table: "people", value: {} },
      ],
      { sourceDeviceId: "device-1" },
    );

    assert.equal(event.serverSequence, 12);
    assert.deepEqual(event.affectedTables.toSorted(), ["people", "people_tags"]);
    assert.equal(event.sourceDeviceId, "device-1");
  });

  it("omits sourceDeviceId when not provided", () => {
    const event = syncWakeEventFromChanges(3, [
      { entityId: "x", operation: "delete", table: "tags", value: null },
    ]);

    assert.equal(event.sourceDeviceId, undefined);
    assert.deepEqual(event.affectedTables, ["tags"]);
  });
});
