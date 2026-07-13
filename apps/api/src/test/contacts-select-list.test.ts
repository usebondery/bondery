import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { contactsSelectableListResponseSchema } from "@bondery/schemas";
import { EXAMPLE_CONTACTS_SELECTABLE_LIST_RESPONSE } from "@bondery/schemas/openapi/fixtures/schema-examples";

describe("contacts selectable list response schema", () => {
  it("parses a paginated selectable contacts list", () => {
    const parsed = contactsSelectableListResponseSchema.parse(
      EXAMPLE_CONTACTS_SELECTABLE_LIST_RESPONSE,
    );

    assert.equal(parsed.contacts.length, 1);
    assert.equal(parsed.contacts[0]?.firstName, "Ada");
    assert.equal(parsed.contacts[0]?.headline, "Mathematician");
    assert.equal(
      parsed.pagination.total,
      EXAMPLE_CONTACTS_SELECTABLE_LIST_RESPONSE.pagination.total,
    );
  });

  it("rejects contacts with enrichment fields", () => {
    assert.throws(() =>
      contactsSelectableListResponseSchema.parse({
        contacts: [
          {
            avatar: null,
            emails: ["ada@example.com"],
            firstName: "Ada",
            id: "550e8400-e29b-41d4-a716-446655440000",
            lastName: "Lovelace",
          },
        ],
        pagination: EXAMPLE_CONTACTS_SELECTABLE_LIST_RESPONSE.pagination,
      }),
    );
  });
});
