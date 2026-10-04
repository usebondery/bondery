import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ApiError } from "@bondery/helpers/api";
import { isMissingContactError } from "./isMissingContactError.js";
import { missingResourceError } from "./missingResourceError.js";

describe("isMissingContactError", () => {
  it("matches catalog 404 codes", () => {
    assert.equal(isMissingContactError(missingResourceError("contact_not_found")), true);
    assert.equal(
      isMissingContactError(
        new ApiError({ code: "not_found", developerMessage: "not_found", status: 404 }),
      ),
      true,
    );
  });

  it("does not match English Error messages", () => {
    assert.equal(isMissingContactError(new Error("Contact not found")), false);
  });

  it("does not match other missing resources", () => {
    assert.equal(isMissingContactError(missingResourceError("group_not_found")), false);
  });
});
