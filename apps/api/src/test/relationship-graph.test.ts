import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { DomainError } from "../domains/_shared/context.js";
import { resetStorageForTests, setStorageForTests } from "../lib/storage/get-storage.js";
import {
  getRelationshipGraph,
  RELATIONSHIP_GRAPH_EDGE_CAP,
  RELATIONSHIP_GRAPH_GROUP_HULL_CAP,
  RELATIONSHIP_GRAPH_HUB_CAP,
  RELATIONSHIP_GRAPH_NODE_CAP,
} from "../services/contacts/queries-graph.js";
import { createMemoryStorage } from "./memory-storage.js";
import {
  caller,
  createFakeClient,
  type EdgeSeed,
  edge,
  type PersonSeed,
  person,
  schoolRow,
  workRow,
} from "./relationship-graph-fixture.js";

/**
 * Tenant isolation and caps for the relationship graph. The fake client
 * applies `where` the way Postgres would, so a missing userId filter fails
 * the test. The contacts suite tests query functions this way. It does not
 * boot the Fastify app.
 */

describe("getRelationshipGraph", () => {
  before(() => {
    setStorageForTests(createMemoryStorage());
  });

  after(() => {
    resetStorageForTests();
  });

  const userA = "user-a";
  const userB = "user-b";
  const personA = "person-a";
  const personB = "person-b";
  const neighborA = "neighbor-a";
  const neighborB = "neighbor-b";
  const unlinkedA = "unlinked-a";
  const unlinkedB = "unlinked-b";

  const client = createFakeClient({
    edges: [
      edge("edge-a-neighbor", userA, personA, neighborA, "parent", new Date(1)),
      edge("edge-a-other", userA, personA, neighborB, "friend", new Date(2)),
      edge("edge-neighbors", userA, neighborA, neighborB, "sibling", new Date(3)),
      edge("edge-b", userB, personB, unlinkedB, "colleague", new Date(4)),
    ],
    people: [
      person(personA, userA, "Ada"),
      person(neighborA, userA, "Bea"),
      person(neighborB, userA, "Cam"),
      person(unlinkedA, userA, "Dee"),
      person(personB, userB, "Eve"),
      person(unlinkedB, userB, "Fay"),
    ],
  });

  it("keeps the published caps", () => {
    assert.equal(RELATIONSHIP_GRAPH_NODE_CAP, 500);
    assert.equal(RELATIONSHIP_GRAPH_EDGE_CAP, 1000);
    assert.equal(RELATIONSHIP_GRAPH_HUB_CAP, 40);
    assert.equal(RELATIONSHIP_GRAPH_GROUP_HULL_CAP, 8);
  });

  it("returns none of another user's nodes or edges", async () => {
    const result = await getRelationshipGraph(caller(client, userA), {});
    const nodeIds = result.graph.nodes.map((node) => node.id);
    const edgeIds = result.graph.edges.map((row) => row.id);

    assert.equal(nodeIds.includes(personB), false);
    assert.equal(nodeIds.includes(unlinkedB), false);
    assert.equal(edgeIds.includes("edge-b"), false);
    assert.deepEqual(nodeIds.sort(), [neighborA, neighborB, personA].sort());
    assert.equal(result.graph.unlinkedCount, 1);
    assert.deepEqual(
      result.graph.unlinked.map((row) => row.id),
      [unlinkedA],
    );
  });

  it("returns contact_not_found when focus is another user's person", async () => {
    await assert.rejects(
      () => getRelationshipGraph(caller(client, userA), { focus: personB }),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "contact_not_found");
        return true;
      },
    );
  });

  it("omits an edge that only connects two neighbors", async () => {
    const result = await getRelationshipGraph(caller(client, userA), { focus: personA });
    const edgeIds = result.graph.edges.map((row) => row.id);

    assert.deepEqual(edgeIds.sort(), ["edge-a-neighbor", "edge-a-other"].sort());
    assert.equal(edgeIds.includes("edge-neighbors"), false);
    assert.equal(result.graph.unlinkedCount, 1);
    assert.deepEqual(result.graph.unlinked, []);
  });

  it("puts the owner first and leaves relationship edges unchanged", async () => {
    const owner = person("me", userA, "Morgan");
    owner.myself = true;
    const ada = person("ada", userA, "Ada");
    ada.headline = "Engineer";
    ada.location = "London";
    const seeded = createFakeClient({
      edges: [edge("edge-friends", userA, "ada", "bea", "friend", new Date(1))],
      people: [owner, ada, person("bea", userA, "Bea")],
    });
    const result = await getRelationshipGraph(caller(seeded, userA), {});

    assert.equal(result.graph.nodes[0]?.id, "me");
    assert.equal(result.graph.nodes[0]?.myself, true);
    assert.equal(result.graph.nodes[0]?.headline, null);
    const adaNode = result.graph.nodes.find((node) => node.id === "ada");
    assert.equal(adaNode?.headline, "Engineer");
    assert.equal(adaNode?.location, "London");
    assert.deepEqual(
      result.graph.nodes.slice(1).map((node) => node.id),
      ["ada", "bea"],
    );
    assert.deepEqual(
      result.graph.edges.map((row) => row.id),
      ["edge-friends"],
    );

    const focused = await getRelationshipGraph(caller(seeded, userA), { focus: "ada" });
    assert.deepEqual(focused.graph.nodes.map((node) => node.id).sort(), ["ada", "bea", "me"]);
    assert.deepEqual(
      focused.graph.edges.map((row) => row.id),
      ["edge-friends"],
    );
  });

  it("returns the focus person alone when that person has no links", async () => {
    const result = await getRelationshipGraph(caller(client, userA), { focus: unlinkedA });
    assert.deepEqual(
      result.graph.nodes.map((node) => node.id),
      [unlinkedA],
    );
    assert.deepEqual(result.graph.edges, []);
    assert.equal(result.graph.truncated, false);
  });

  it("sets truncated and returns the node cap for 501 people", async () => {
    const people: PersonSeed[] = [];
    const edges: EdgeSeed[] = [];
    const count = RELATIONSHIP_GRAPH_NODE_CAP + 1;
    for (let index = 0; index < count; index += 1) {
      people.push(person(`p-${index}`, userA, `P${index}`));
    }
    for (let index = 0; index < count - 1; index += 1) {
      edges.push(
        edge(`e-${index}`, userA, `p-${index}`, `p-${index + 1}`, "friend", new Date(index)),
      );
    }
    const capped = createFakeClient({ edges, people });
    const result = await getRelationshipGraph(caller(capped, userA), {});

    assert.equal(result.graph.truncated, true);
    assert.equal(result.graph.nodes.length, RELATIONSHIP_GRAPH_NODE_CAP);
    assert.equal(
      result.graph.nodes.some((node) => node.id === `p-${RELATIONSHIP_GRAPH_NODE_CAP}`),
      false,
    );
    assert.equal(
      result.graph.edges.some(
        (row) =>
          row.sourcePersonId === `p-${RELATIONSHIP_GRAPH_NODE_CAP}` ||
          row.targetPersonId === `p-${RELATIONSHIP_GRAPH_NODE_CAP}`,
      ),
      false,
    );
  });

  it("sets truncated and returns the edge cap for 1001 edges", async () => {
    const people = [person("hub", userA, "Hub"), person("leaf", userA, "Leaf")];
    const edges: EdgeSeed[] = [];
    const count = RELATIONSHIP_GRAPH_EDGE_CAP + 1;
    for (let index = 0; index < count; index += 1) {
      edges.push(edge(`many-${index}`, userA, "hub", "leaf", "friend", new Date(index)));
    }
    const capped = createFakeClient({ edges, people });
    const result = await getRelationshipGraph(caller(capped, userA), {});

    assert.equal(result.graph.truncated, true);
    assert.equal(result.graph.edges.length, RELATIONSHIP_GRAPH_EDGE_CAP);
    assert.equal(result.graph.nodes.length, 2);
  });

  it("returns no hubs and does not read history when hubs is off", async () => {
    const seeded = createFakeClient({
      edges: [edge("edge-off", userA, personA, neighborA)],
      people: [person(personA, userA, "Ada"), person(neighborA, userA, "Bea")],
      work: [workRow(userA, personA, "Acme"), workRow(userA, neighborA, "Acme")],
    });
    const result = await getRelationshipGraph(caller(seeded, userA), {});

    assert.deepEqual(result.graph.hubs, []);
    assert.deepEqual(result.graph.groups, []);
    assert.equal(seeded.reads.work, 0);
    assert.equal(seeded.reads.education, 0);
    assert.equal(seeded.reads.groups, 0);
    assert.equal(
      result.graph.nodes.some((node) => node.id === personA),
      true,
    );
  });

  it("includes every shared company and school, and omits a one-person company", async () => {
    const past = new Date("2019-05-01");
    const seeded = createFakeClient({
      edges: [],
      education: [
        schoolRow(userA, "ada", "State University", past),
        schoolRow(userA, "bea", "State University", past),
      ],
      people: [
        person("ada", userA, "Ada"),
        person("bea", userA, "Bea"),
        person("cam", userA, "Cam"),
        person("dee", userA, "Dee"),
        person("eve", userA, "Eve"),
        person("bob-1", userB, "Bob"),
        person("bob-2", userB, "Bea"),
      ],
      work: [
        workRow(userA, "ada", "Acme"),
        workRow(userA, "bea", "Acme"),
        workRow(userA, "cam", "Solo"),
        workRow(userA, "dee", "Past Co", past),
        workRow(userA, "eve", "Past Co", past),
        workRow(userB, "bob-1", "Secret Co", null, "secret-li"),
        workRow(userB, "bob-2", "Secret Co", null, "secret-li"),
      ],
    });
    const result = await getRelationshipGraph(caller(seeded, userA), { hubs: "1" });
    const hubIds = result.graph.hubs.map((row) => row.id);

    assert.deepEqual(hubIds.sort(), [
      "company:name:acme",
      "company:name:past",
      "school:name:state university",
    ]);
    const company = result.graph.hubs.find((row) => row.kind === "company");
    const school = result.graph.hubs.find((row) => row.kind === "school");
    assert.deepEqual(company?.personIds, ["ada", "bea"]);
    assert.equal(company?.memberCount, 2);
    assert.equal(company?.logoUrl, null);
    assert.equal(school?.logoUrl, null);
    assert.deepEqual(school?.personIds, ["ada", "bea"]);
    assert.equal(school?.memberCount, 2);
    assert.deepEqual(result.graph.edges, []);
    assert.deepEqual(
      result.graph.nodes.map((node) => node.id),
      ["ada", "bea", "dee", "eve"],
    );
    assert.equal(
      result.graph.nodes.some((node) => node.id === "bob-1" || node.id === "bob-2"),
      false,
    );
    assert.equal(
      hubIds.some((id) => id.includes("secret")),
      false,
    );
    assert.equal(result.graph.truncated, false);
  });

  it("does not pull an outside coworker into focus mode", async () => {
    const seeded = createFakeClient({
      edges: [edge("edge-focus", userA, "ada", "bea", "friend", new Date(1))],
      education: [],
      people: [
        person("ada", userA, "Ada"),
        person("bea", userA, "Bea"),
        person("cam", userA, "Cam"),
        person("bob-1", userB, "Bob"),
      ],
      work: [
        workRow(userA, "ada", "Shared", null, "shared-li"),
        workRow(userA, "bea", "Shared", null, "shared-li"),
        workRow(userA, "cam", "Shared", null, "shared-li"),
        workRow(userA, "ada", "Side"),
        workRow(userA, "cam", "Side"),
        workRow(userB, "bob-1", "Secret Co", null, "secret-li"),
      ],
    });
    const result = await getRelationshipGraph(caller(seeded, userA), {
      focus: "ada",
      hubs: "1",
    });

    assert.deepEqual(result.graph.nodes.map((node) => node.id).sort(), ["ada", "bea"]);
    assert.deepEqual(
      result.graph.edges.map((row) => row.id),
      ["edge-focus"],
    );
    assert.equal(result.graph.hubs.length, 1);
    assert.equal(result.graph.hubs[0]?.id, "company:li:shared-li");
    assert.equal(
      result.graph.hubs[0]?.logoUrl,
      "https://storage.test/linkedin-logos/user-a/shared-li.jpg",
    );
    assert.deepEqual(result.graph.hubs[0]?.personIds, ["ada", "bea"]);
    assert.equal(result.graph.hubs[0]?.memberCount, 3);
    assert.equal(result.graph.truncated, true);
    assert.equal(
      result.graph.nodes.some((node) => node.id === "cam" || node.id === "bob-1"),
      false,
    );
  });

  it("shows people who share a group and have no relationship", async () => {
    const seeded = createFakeClient({
      edges: [],
      groups: [
        {
          color: null,
          emoji: null,
          id: "friends",
          label: "Friends",
          personIds: ["ada", "bea", "cam"],
          userId: userA,
        },
      ],
      people: [
        person("ada", userA, "Ada"),
        person("bea", userA, "Bea"),
        person("cam", userA, "Cam"),
        person("dee", userA, "Dee"),
      ],
    });
    const result = await getRelationshipGraph(caller(seeded, userA), { groups: "1" });

    assert.deepEqual(result.graph.nodes.map((node) => node.id).sort(), ["ada", "bea", "cam"]);
    assert.equal(result.graph.groups.length, 1);
    assert.deepEqual(result.graph.groups[0]?.personIds, ["ada", "bea", "cam"]);
    assert.deepEqual(result.graph.edges, []);
  });
});
