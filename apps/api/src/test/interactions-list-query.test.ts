import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EXAMPLE_CONTACT_ID } from "@bondery/schemas";
import { interactionsListQuerySchema } from "@bondery/schemas/http";

describe("interactionsListQuerySchema", () => {
  it("accepts optional contactId filter", () => {
    const parsed = interactionsListQuerySchema.parse({
      contactId: EXAMPLE_CONTACT_ID,
      limit: "50",
      offset: "0",
    });

    assert.equal(parsed.contactId, EXAMPLE_CONTACT_ID);
    assert.equal(parsed.limit, 50);
    assert.equal(parsed.offset, 0);
  });

  it("rejects invalid contactId", () => {
    assert.throws(() =>
      interactionsListQuerySchema.parse({
        contactId: "not-a-uuid",
      }),
    );
  });

  it("accepts trimmed search and inclusive ISO start_date and end_date", () => {
    const parsed = interactionsListQuerySchema.parse({
      end_date: "2026-06-15T21:59:59.999Z",
      search: "  networking  ",
      start_date: "2026-06-15T00:00:00.000Z",
    });

    assert.equal(parsed.search, "networking");
    assert.equal(parsed.start_date, "2026-06-15T00:00:00.000Z");
    assert.equal(parsed.end_date, "2026-06-15T21:59:59.999Z");
  });

  it("rejects start_date after end_date", () => {
    assert.throws(() =>
      interactionsListQuerySchema.parse({
        end_date: "2026-06-01T00:00:00.000Z",
        start_date: "2026-06-02T00:00:00.000Z",
      }),
    );
  });

  it("rejects a bad datetime", () => {
    assert.throws(() =>
      interactionsListQuerySchema.parse({
        start_date: "2026-06-15",
      }),
    );
  });
});
