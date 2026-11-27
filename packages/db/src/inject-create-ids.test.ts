import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isUuidV7 } from "@bondery/helpers/ids";

import { injectCreateIds } from "./inject-create-ids.js";

describe("injectCreateIds", () => {
  it("injects UUIDv7 when id is missing", () => {
    const result = injectCreateIds({ firstName: "Ada" }) as { id: string; firstName: string };
    assert.equal(isUuidV7(result.id), true);
    assert.equal(result.firstName, "Ada");
  });

  it("preserves an explicit id", () => {
    const existingId = "01932f1a-7b2e-7000-8000-000000000001";
    const result = injectCreateIds({ firstName: "Ada", id: existingId }) as {
      id: string;
      firstName: string;
    };
    assert.equal(result.id, existingId);
  });

  it("injects ids for nested create payloads", () => {
    const result = injectCreateIds({
      firstName: "Ada",
      phones: {
        create: [{ number: "+15551234567" }],
      },
    }) as unknown as {
      id: string;
      phones: { create: Array<{ id: string; number: string }> };
    };

    assert.equal(isUuidV7(result.id), true);
    assert.equal(isUuidV7(result.phones.create[0]?.id ?? ""), true);
  });

  it("does not inject id for composite-key rows", () => {
    const result = injectCreateIds({
      interactionId: "01932f1a-7b2e-7000-8000-000000000001",
      personId: "01932f1a-7b2e-7000-8000-000000000002",
    }) as Record<string, unknown>;

    assert.equal("id" in result, false);
  });

  it("does not inject id for CardDAV card versions and vCard extras", () => {
    const version = { cardId: "01932f1a-7b2e-7000-8000-000000000003", etag: "abc", projection: {} };
    const extras = {
      personId: "01932f1a-7b2e-7000-8000-000000000002",
      properties: {},
      userId: "u",
    };

    assert.deepEqual(injectCreateIds(version), version);
    assert.deepEqual(injectCreateIds(extras), extras);
  });

  it("does not inject id for a Stripe webhook event, which is keyed by eventId", () => {
    // Regression: an injected `id` made every Stripe webhook answer 500.
    const row = { eventId: "evt_123", eventType: "invoice.paid" };

    assert.deepEqual(injectCreateIds(row), row);
    assert.deepEqual(injectCreateIds([row]), [row]);
  });
});
