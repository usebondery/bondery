import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NEXT_ACTION_PARAM, NEXT_ACTIONS, personPathWithNextAction } from "./webapp-query.js";

describe("webapp next_action query", () => {
  it("uses snake_case next_action=intended_action, not one-off flags", () => {
    assert.equal(NEXT_ACTION_PARAM, "next_action");
    assert.equal(NEXT_ACTIONS.ADD_INTERACTION, "add_interaction");
  });

  it("builds a person URL that opens add interaction", () => {
    assert.equal(
      personPathWithNextAction("abc", NEXT_ACTIONS.ADD_INTERACTION),
      "/app/person/abc?next_action=add_interaction",
    );
  });
});
