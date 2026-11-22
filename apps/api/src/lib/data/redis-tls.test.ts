import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { inspectRedisTls } from "./redis-tls.js";

describe("inspectRedisTls", () => {
  it("returns no TLS for a plain redis URL", async () => {
    const inspection = await inspectRedisTls("redis://127.0.0.1:26636", {});
    assert.deepEqual(inspection, {
      certificateDaysLeft: null,
      mutualTls: false,
      tls: false,
      version: null,
    });
  });
});
