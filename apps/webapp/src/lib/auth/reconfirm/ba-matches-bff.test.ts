import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { baIdentityMatchesBff } from "./ba-matches-bff.js";

describe("baIdentityMatchesBff", () => {
  it("matches Better Auth user id to the BFF identity user_id", () => {
    assert.equal(
      baIdentityMatchesBff({
        baEmail: "other@example.test",
        baUserId: "user-1",
        bffEmail: "me@example.test",
        bffUserId: "user-1",
      }),
      true,
    );
    assert.equal(
      baIdentityMatchesBff({
        baEmail: "me@example.test",
        baUserId: "user-1",
        bffEmail: "me@example.test",
        bffUserId: "user-2",
      }),
      false,
    );
  });

  it("falls back to email when there is no BFF user id", () => {
    assert.equal(
      baIdentityMatchesBff({
        baEmail: "Me@example.test",
        baUserId: "user-1",
        bffEmail: "me@example.test",
        bffUserId: null,
      }),
      true,
    );
  });
});
