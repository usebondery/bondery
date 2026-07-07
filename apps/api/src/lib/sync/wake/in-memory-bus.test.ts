import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemorySyncWakeBus } from "./in-memory-bus.js";

describe("InMemorySyncWakeBus", () => {
  it("delivers published events to the started handler", async () => {
    const bus = new InMemorySyncWakeBus();
    const received: Array<{ userId: string; serverSequence: number }> = [];

    await bus.start((userId, event) => {
      received.push({ userId, serverSequence: event.serverSequence });
    });

    await bus.publish("user-1", {
      serverSequence: 7,
      affectedTables: ["people"],
    });

    assert.deepEqual(received, [{ userId: "user-1", serverSequence: 7 }]);
    await bus.stop();
  });
});
