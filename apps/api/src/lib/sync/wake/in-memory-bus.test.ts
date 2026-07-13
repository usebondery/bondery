import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemorySyncWakeBus } from "./in-memory-bus.js";

describe("InMemorySyncWakeBus", () => {
  it("delivers published events to the started handler", async () => {
    const bus = new InMemorySyncWakeBus();
    const received: Array<{ userId: string; serverSequence: number }> = [];

    await bus.start((userId, event) => {
      received.push({ serverSequence: event.serverSequence, userId });
    });

    await bus.publish("user-1", {
      affectedTables: ["people"],
      serverSequence: 7,
    });

    assert.deepEqual(received, [{ serverSequence: 7, userId: "user-1" }]);
    await bus.stop();
  });
});
