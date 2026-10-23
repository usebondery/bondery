import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../../domains/_shared/context.js";
import { resultFromCaughtSyncMutation, unknownMutationRejectedResult } from "./apply-mutation.js";

describe("resultFromCaughtSyncMutation", () => {
  it("includes DomainError.code on a rejected result", () => {
    const mapped = resultFromCaughtSyncMutation(
      "11111111-1111-4111-8111-111111111111",
      new DomainError("Contact not found", 404, "contact_not_found"),
    );

    assert.ok(mapped);
    assert.equal(mapped.result.status, "rejected");
    if (mapped.result.status !== "rejected") {
      return;
    }

    assert.equal(mapped.result.code, "contact_not_found");
    assert.equal(mapped.result.error, "Contact not found");
  });

  it("returns null for unexpected errors so the caller rethrows", () => {
    assert.equal(
      resultFromCaughtSyncMutation("11111111-1111-4111-8111-111111111111", new Error("boom")),
      null,
    );
  });
});

describe("unknownMutationRejectedResult", () => {
  it("maps unknown mutation types to bad_request", () => {
    const result = unknownMutationRejectedResult("11111111-1111-4111-8111-111111111111");

    assert.equal(result.status, "rejected");
    assert.equal(result.code, "bad_request");
  });
});
