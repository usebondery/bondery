import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  enrichQueueCountResponseSchema,
  keepInTouchCountResponseSchema,
  mergeRecommendationsCountResponseSchema,
} from "@bondery/schemas";

describe("contacts attention count response schemas", () => {
  it("parses merge recommendations count", () => {
    const parsed = mergeRecommendationsCountResponseSchema.parse({ activeCount: 3 });
    assert.equal(parsed.activeCount, 3);
  });

  it("rejects negative merge recommendations count", () => {
    assert.throws(() => mergeRecommendationsCountResponseSchema.parse({ activeCount: -1 }));
  });

  it("parses enrich queue count", () => {
    const parsed = enrichQueueCountResponseSchema.parse({ eligibleCount: 42 });
    assert.equal(parsed.eligibleCount, 42);
  });

  it("rejects non-integer enrich queue count", () => {
    assert.throws(() => enrichQueueCountResponseSchema.parse({ eligibleCount: 1.5 }));
  });

  it("parses keep in touch overdue count", () => {
    const parsed = keepInTouchCountResponseSchema.parse({ overdueCount: 2 });
    assert.equal(parsed.overdueCount, 2);
  });
});
