import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keepInTouchCountResponseSchema } from "@bondery/schemas";

import { getKeepInTouchOverdueCount } from "../domains/contacts/keep-in-touch.js";

describe("keepInTouchCountResponseSchema", () => {
  it("parses overdueCount", () => {
    const parsed = keepInTouchCountResponseSchema.parse({ overdueCount: 3 });
    assert.equal(parsed.overdueCount, 3);
  });

  it("rejects negative overdueCount", () => {
    assert.throws(() => keepInTouchCountResponseSchema.parse({ overdueCount: -1 }));
  });
});

describe("getKeepInTouchOverdueCount", () => {
  it("returns count from rpc", async () => {
    const result = await getKeepInTouchOverdueCount({
      client: {
        rpc: async () => ({ data: 5, error: null }),
      } as never,
      log: undefined,
      user: { id: "user-1" } as never,
    });

    assert.deepEqual(result, { overdueCount: 5 });
  });

  it("returns zero when rpc data is null", async () => {
    const result = await getKeepInTouchOverdueCount({
      client: {
        rpc: async () => ({ data: null, error: null }),
      } as never,
      log: undefined,
      user: { id: "user-1" } as never,
    });

    assert.deepEqual(result, { overdueCount: 0 });
  });
});
