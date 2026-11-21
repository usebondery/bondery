import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatLegalAddressLine, LEGAL_ENTITY } from "./company.js";

describe("legal entity", () => {
  it("formats a single-line registered address for email footers", () => {
    assert.equal(formatLegalAddressLine(), "Fryčajova 82/8, 614 00 Brno, Czechia");
    assert.equal(LEGAL_ENTITY.legalName, "Sveetech s.r.o.");
  });
});
