import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { matchDynamicRoute } from "./routeTitleRegistry.js";

describe("matchDynamicRoute", () => {
  it("matches chat session paths and ignores the chat index", () => {
    assert.deepEqual(matchDynamicRoute(`${WEBAPP_ROUTES.CHAT}/abc`), {
      id: "abc",
      kind: "chat",
    });
    assert.equal(matchDynamicRoute(WEBAPP_ROUTES.CHAT), null);
  });
});
