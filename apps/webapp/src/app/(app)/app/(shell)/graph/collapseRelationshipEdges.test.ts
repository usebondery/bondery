import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collapseRelationshipEdges } from "./collapseRelationshipEdges.js";

describe("collapseRelationshipEdges", () => {
  it("points parent to child and keeps both types", () => {
    const [visual] = collapseRelationshipEdges([
      {
        id: "parent-row",
        relationshipType: "parent",
        sourcePersonId: "A",
        targetPersonId: "B",
      },
      {
        id: "child-row",
        relationshipType: "child",
        sourcePersonId: "B",
        targetPersonId: "A",
      },
    ]);

    assert.ok(visual);
    assert.equal(visual.sourcePersonId, "A");
    assert.equal(visual.targetPersonId, "B");
    assert.equal(visual.directed, true);
    assert.equal(visual.relationshipTypes.includes("parent"), true);
    assert.equal(visual.relationshipTypes.includes("child"), true);
  });

  it("collapses duplicate identical rows to one line", () => {
    const visual = collapseRelationshipEdges([
      {
        id: "one",
        relationshipType: "friend",
        sourcePersonId: "A",
        targetPersonId: "B",
      },
      {
        id: "two",
        relationshipType: "friend",
        sourcePersonId: "A",
        targetPersonId: "B",
      },
    ]);

    assert.equal(visual.length, 1);
    assert.deepEqual(visual[0]?.relationshipTypes, ["friend"]);
    assert.equal(visual[0]?.directed, false);
  });
});
