import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { isChatRoute } from "./isChatRoute.js";

describe("isChatRoute", () => {
  it("matches the chat index and session paths", () => {
    assert.equal(isChatRoute(WEBAPP_ROUTES.CHAT), true);
    assert.equal(isChatRoute(`${WEBAPP_ROUTES.CHAT}/abc`), true);
  });

  it("does not match browse routes or chat-prefixed lookalikes", () => {
    assert.equal(isChatRoute(WEBAPP_ROUTES.HOME), false);
    assert.equal(isChatRoute(`${WEBAPP_ROUTES.CHAT}ty`), false);
  });
});
