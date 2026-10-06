import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toApiWorkHistory } from "./workExperience";

describe("toApiWorkHistory", () => {
  it("omits companyUrn and keeps schema fields", () => {
    const [row] = toApiWorkHistory([
      {
        companyLinkedinId: "acme",
        companyLogoUrl: "https://example.com/logo.png",
        companyName: "Acme",
        companyUrn: "urn:li:fsd_company:1",
        title: "Engineer",
      },
    ]);
    assert.ok(row);
    assert.equal(row.companyName, "Acme");
    assert.equal(row.title, "Engineer");
    assert.equal(row.companyLinkedinId, "acme");
    assert.equal("companyUrn" in row, false);
  });
});
