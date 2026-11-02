import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RelationshipGraphHub } from "@bondery/schemas";
import {
  buildHubBuckets,
  type EducationHistoryRow,
  normalizeHubName,
  placeFocusHubs,
  placeGroupMembersOnCanvas,
  placeHubsOnCanvas,
  RELATIONSHIP_GRAPH_GROUP_HULL_CAP,
  RELATIONSHIP_GRAPH_HUB_CAP,
  selectGraphGroups,
  type WorkHistoryRow,
} from "./graph-hubs.js";

function work(
  personId: string,
  companyLinkedinId: string | null,
  companyName: string,
  endDate: Date | null = null,
): WorkHistoryRow {
  return { companyLinkedinId, companyName, endDate, personId };
}

function school(
  personId: string,
  schoolLinkedinId: string | null,
  schoolName: string,
): EducationHistoryRow {
  return { personId, schoolLinkedinId, schoolName };
}

function hub(
  id: string,
  kind: RelationshipGraphHub["kind"],
  personIds: string[],
  memberCount = personIds.length,
): RelationshipGraphHub {
  return { id, kind, label: id, logoUrl: null, memberCount, personIds };
}

describe("normalizeHubName", () => {
  it("folds a leading the and one legal suffix", () => {
    assert.equal(normalizeHubName("  The Acme, Inc. "), "acme");
    assert.equal(normalizeHubName("Acme Incorporated"), "acme");
    assert.equal(normalizeHubName("Acme Inc LLC"), "acme inc");
  });

  it("returns null when the name folds to empty", () => {
    assert.equal(normalizeHubName("   "), null);
    assert.equal(normalizeHubName("Inc."), null);
    assert.equal(normalizeHubName("The"), null);
  });

  it("strips diacritics and turns & into a space", () => {
    assert.equal(normalizeHubName("Café & Société"), "cafe societe");
  });
});

describe("buildHubBuckets", () => {
  it("lets a linkedin id beat the name and stays apart from a name bucket", () => {
    const hubs = buildHubBuckets(
      [
        work("a", "99", "Acme"),
        work("b", "99", "Acme Holdings"),
        work("c", null, "Acme"),
        work("d", null, "Acme"),
      ],
      [],
    );
    const byId = new Map(hubs.map((row) => [row.id, row]));

    assert.deepEqual([...byId.keys()].sort(), ["company:li:99", "company:name:acme"]);
    assert.deepEqual(byId.get("company:li:99")?.personIds, ["a", "b"]);
    assert.deepEqual(byId.get("company:name:acme")?.personIds, ["c", "d"]);
  });

  it("folds suffixes and skips an empty name", () => {
    const hubs = buildHubBuckets(
      [
        work("a", null, "Acme, Inc."),
        work("b", null, "The Acme LLC"),
        work("c", null, "Inc."),
        work("d", null, "..."),
      ],
      [],
    );

    assert.equal(hubs.length, 1);
    assert.equal(hubs[0]?.id, "company:name:acme");
    assert.deepEqual(hubs[0]?.personIds, ["a", "b"]);
    assert.equal(hubs[0]?.label, "Acme, Inc.");
  });

  it("picks the shorter raw name when counts tie", () => {
    const hubs = buildHubBuckets([work("a", null, "Acme LLC"), work("b", null, "Acme Ltd")], []);

    assert.equal(hubs[0]?.label, "Acme LLC");
  });

  it("keeps school keys apart from company keys", () => {
    const hubs = buildHubBuckets(
      [work("a", null, "Harvard"), work("b", null, "Harvard")],
      [school("a", null, "Harvard"), school("b", null, "Harvard")],
    );

    assert.deepEqual(hubs.map((row) => row.id).sort(), [
      "company:name:harvard",
      "school:name:harvard",
    ]);
  });

  it("includes past jobs and every school row", () => {
    const past = new Date("2020-01-01");
    const hubs = buildHubBuckets(
      [
        work("a", null, "Now", null),
        work("b", null, "Now", null),
        work("a", null, "Old", past),
        work("b", null, "Old", past),
      ],
      [school("a", null, "State"), school("b", null, "State")],
    );

    assert.deepEqual(hubs.map((row) => row.id).sort(), [
      "company:name:now",
      "company:name:old",
      "school:name:state",
    ]);
  });

  it("requires two distinct people", () => {
    const hubs = buildHubBuckets(
      [work("a", null, "Acme"), work("a", null, "Acme Inc"), work("a", "99", "Other")],
      [school("a", null, "State")],
    );

    assert.deepEqual(hubs, []);
  });
});

describe("placeHubsOnCanvas", () => {
  it("adds unlinked people from the largest hub until the person cap", () => {
    const placed = placeHubsOnCanvas({
      admittedRelationshipIds: ["p1"],
      hubs: [
        hub("company:name:big", "company", ["p1", "p2", "p3", "p4"]),
        hub("company:name:small", "company", ["p5", "p6"]),
      ],
      nodeCap: 3,
      unlinkedPersonIds: new Set(["p2", "p3", "p4", "p5", "p6"]),
    });

    assert.deepEqual(placed.personIds, ["p1", "p2", "p3"]);
    assert.equal(placed.truncated, true);
    assert.equal(placed.hubs.length, 1);
    assert.deepEqual(placed.hubs[0]?.personIds, ["p1", "p2", "p3"]);
    assert.equal(placed.hubs[0]?.memberCount, 4);
  });

  it("does not count hub circles toward the person cap", () => {
    const placed = placeHubsOnCanvas({
      admittedRelationshipIds: ["a", "b"],
      hubs: [hub("company:name:acme", "company", ["a", "b", "c"], 3)],
      nodeCap: 2,
      unlinkedPersonIds: new Set(["c"]),
    });

    assert.deepEqual(placed.personIds, ["a", "b"]);
    assert.equal(placed.hubs.length, 1);
    assert.deepEqual(placed.hubs[0]?.personIds, ["a", "b"]);
    assert.equal(placed.truncated, true);
  });

  it("keeps at most the hub cap", () => {
    const hubs = Array.from({ length: RELATIONSHIP_GRAPH_HUB_CAP + 1 }, (_, index) => {
      const key = String(index).padStart(2, "0");
      return hub(`company:name:${key}`, "company", [`a${key}`, `b${key}`]);
    });
    const placed = placeHubsOnCanvas({
      admittedRelationshipIds: [],
      hubs,
      nodeCap: 500,
      unlinkedPersonIds: new Set(hubs.flatMap((row) => row.personIds)),
    });

    assert.equal(placed.hubs.length, RELATIONSHIP_GRAPH_HUB_CAP);
    assert.equal(placed.truncated, true);
    assert.equal(placed.personIds.length, RELATIONSHIP_GRAPH_HUB_CAP * 2);
  });
});

describe("placeFocusHubs", () => {
  it("draws a hub only for people already in the neighborhood", () => {
    const hubs = buildHubBuckets(
      [work("a", "1", "Shared"), work("b", "1", "Shared"), work("c", "1", "Shared")],
      [],
    );
    const placed = placeFocusHubs({
      hubs,
      neighborhoodIds: new Set(["a", "b"]),
    });

    assert.equal(placed.hubs.length, 1);
    assert.deepEqual(placed.hubs[0]?.personIds, ["a", "b"]);
    assert.equal(placed.hubs[0]?.memberCount, 3);
    assert.equal(placed.truncated, true);
  });
});

describe("placeGroupMembersOnCanvas", () => {
  it("adds group members who are not already on the canvas", () => {
    const placed = placeGroupMembersOnCanvas({
      admittedIds: ["a"],
      groups: [
        { color: null, emoji: null, id: "g-small", label: "Small", personIds: ["a", "b"] },
        { color: null, emoji: null, id: "g-large", label: "Large", personIds: ["c", "d", "e"] },
      ],
      nodeCap: 4,
    });

    assert.deepEqual(placed.personIds, ["a", "c", "d", "e"]);
    assert.equal(placed.truncated, true);
  });
});

describe("selectGraphGroups", () => {
  it("keeps groups with three people on the canvas and caps the list", () => {
    assert.equal(RELATIONSHIP_GRAPH_GROUP_HULL_CAP, 8);
    const canvas = new Set(["a", "b", "c", "d", "e"]);
    const groups = [
      { color: null, emoji: null, id: "g-small", label: "Small", personIds: ["a", "b"] },
      { color: "#fff", emoji: "A", id: "g-b", label: "B", personIds: ["a", "b", "c"] },
      { color: null, emoji: null, id: "g-a", label: "A", personIds: ["a", "b", "c", "d"] },
    ];
    for (let index = 0; index < 8; index += 1) {
      groups.push({
        color: null,
        emoji: null,
        id: `g-extra-${index}`,
        label: "Extra",
        personIds: ["a", "b", "c"],
      });
    }
    const selected = selectGraphGroups({ canvasPersonIds: canvas, groups });

    assert.equal(selected.length, RELATIONSHIP_GRAPH_GROUP_HULL_CAP);
    assert.equal(selected[0]?.id, "g-a");
    assert.equal(
      selected.some((row) => row.id === "g-small"),
      false,
    );
  });
});
