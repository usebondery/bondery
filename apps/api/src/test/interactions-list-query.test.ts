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
});
