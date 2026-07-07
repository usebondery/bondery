import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SyncConnectionHub } from "./hub.js";
import { WS_OPEN, type SyncWakeSocket } from "./types.js";

function createMockSocket(): SyncWakeSocket & { sent: string[]; closed: boolean } {
  const socket = {
    sent: [] as string[],
    closed: false,
    readyState: WS_OPEN,
    send(data: string) {
      this.sent.push(data);
    },
    close() {
      this.closed = true;
    },
  };
  return socket;
}

describe("SyncConnectionHub", () => {
  it("registers and broadcasts to user sockets", () => {
    const hub = new SyncConnectionHub();
    const socket = createMockSocket();
    hub.register("user-1", socket);

    hub.broadcastWake("user-1", {
      serverSequence: 3,
      affectedTables: ["people"],
    });

    assert.equal(socket.sent.length, 1);
    const payload = JSON.parse(socket.sent[0]!);
    assert.equal(payload.type, "sync.batch");
    assert.equal(payload.serverSequence, 3);
  });

  it("enforces max connections per user", () => {
    const hub = new SyncConnectionHub();
    const sockets = Array.from({ length: 6 }, () => createMockSocket());

    for (const socket of sockets) {
      hub.register("user-1", socket);
    }

    const closed = sockets.filter((socket) => socket.closed);
    assert.equal(closed.length, 1);
    assert.equal(hub.getConnectionCount(), 5);
  });
});
