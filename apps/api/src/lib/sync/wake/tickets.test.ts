import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemorySyncWsTicketStore } from "./tickets.js";

describe("InMemorySyncWsTicketStore", () => {
  it("issues and consumes a ticket once", async () => {
    const store = new InMemorySyncWsTicketStore();
    const { ticket } = await store.issue("user-1");

    const first = await store.consume(ticket);
    const second = await store.consume(ticket);

    assert.equal(first, "user-1");
    assert.equal(second, null);
  });
});
