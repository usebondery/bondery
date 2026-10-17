import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toJsonSafe, toSyncRow } from "./prisma-helpers.js";

describe("toJsonSafe", () => {
  it("keeps plain JSON values", () => {
    assert.equal(toJsonSafe("a"), "a");
    assert.equal(toJsonSafe(1), 1);
    assert.equal(toJsonSafe(true), true);
    assert.equal(toJsonSafe(null), null);
  });

  it("drops buffers and other non-plain objects", () => {
    assert.equal(toJsonSafe(Buffer.from("geo")), null);
    assert.equal(toJsonSafe(new Uint8Array([1, 2])), null);
  });
});

describe("toSyncRow", () => {
  it("snake-cases keys and omits unsupported geography values", () => {
    assert.deepEqual(
      toSyncRow({
        avatarUpdatedAt: new Date("2026-03-01T00:00:00.000Z"),
        firstName: "Ada",
        gisPoint: Buffer.from("0101", "hex"),
        updatedAt: new Date("2026-01-02T03:04:05.000Z"),
      }),
      {
        avatar_updated_at: "2026-03-01T00:00:00.000Z",
        first_name: "Ada",
        gis_point: null,
        updated_at: "2026-01-02T03:04:05.000Z",
      },
    );
  });
});
