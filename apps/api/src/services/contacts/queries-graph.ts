import type {
  AvatarTransformOptions,
  RelationshipGraphEdge,
  RelationshipGraphHub,
  RelationshipGraphNode,
  RelationshipGraphResponse,
  RelationshipGraphUnlinkedPerson,
  RelationshipType,
} from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { notFound } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";
import {
  buildHubBuckets,
  type GraphGroupInput,
  placeFocusHubs,
  placeGroupMembersOnCanvas,
  placeHubsOnCanvas,
  RELATIONSHIP_GRAPH_GROUP_HULL_CAP,
  RELATIONSHIP_GRAPH_HUB_CAP,
  selectGraphGroups,
  withHubLogos,
} from "./graph-hubs.js";
import { listUnlinkedIds, loadOverlays } from "./graph-overlay-queries.js";
import type { ServiceLog } from "./queries-shared.js";

export { RELATIONSHIP_GRAPH_GROUP_HULL_CAP, RELATIONSHIP_GRAPH_HUB_CAP };

/** Global graph stops at this many people. A larger book sets `truncated`. */
export const RELATIONSHIP_GRAPH_NODE_CAP = 500;

/** Global graph stops at this many relationship rows. A larger book sets `truncated`. */
export const RELATIONSHIP_GRAPH_EDGE_CAP = 1000;

const UNLINKED_PREVIEW_LIMIT = 50;

type GraphContext = Pick<DomainContext, "db" | "user"> & { log?: ServiceLog };

type GraphDb = ReturnType<typeof domainDb>;

type PersonNodeRow = {
  avatarUpdatedAt: Date | null;
  firstName: string;
  hasAvatar: boolean;
  headline: string | null;
  id: string;
  lastName: string | null;
  location: string | null;
  middleName: string | null;
  myself: boolean | null;
};

type EdgeRow = {
  id: string;
  relationshipType: string;
  sourcePersonId: string;
  targetPersonId: string;
};

const NODE_SELECT = {
  avatarUpdatedAt: true,
  firstName: true,
  hasAvatar: true,
  headline: true,
  id: true,
  lastName: true,
  location: true,
  middleName: true,
  myself: true,
} as const;

const EDGE_SELECT = {
  id: true,
  relationshipType: true,
  sourcePersonId: true,
  targetPersonId: true,
} as const;

const UNLINKED_SELECT = {
  firstName: true,
  id: true,
  lastName: true,
} as const;

function unlinkedWhere(userId: string) {
  return {
    relationshipsFrom: { none: { userId } },
    relationshipsTo: { none: { userId } },
    userId,
  };
}

function toNode(
  userId: string,
  person: PersonNodeRow,
  avatarOptions?: AvatarTransformOptions,
): RelationshipGraphNode {
  return {
    avatar: resolveContactAvatarUrl(
      userId,
      {
        avatarUpdatedAt: person.avatarUpdatedAt,
        hasAvatar: person.hasAvatar,
        id: person.id,
      },
      avatarOptions,
    ),
    firstName: person.firstName,
    headline: person.headline,
    id: person.id,
    lastName: person.lastName,
    location: person.location,
    middleName: person.middleName,
    myself: person.myself === true,
  };
}

function toEdge(row: EdgeRow): RelationshipGraphEdge {
  return {
    id: row.id,
    relationshipType: row.relationshipType as RelationshipType,
    sourcePersonId: row.sourcePersonId,
    targetPersonId: row.targetPersonId,
  };
}

function toUnlinked(row: {
  firstName: string;
  id: string;
  lastName: string | null;
}): RelationshipGraphUnlinkedPerson {
  return {
    firstName: row.firstName,
    id: row.id,
    lastName: row.lastName,
  };
}

/**
 * Person ids in first-seen order. The focus person stays first so a node cap
 * cannot drop the person the caller asked to see.
 */
function orderedPersonIds(edges: readonly EdgeRow[], focusId?: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  if (focusId) {
    seen.add(focusId);
    ids.push(focusId);
  }
  for (const edge of edges) {
    for (const personId of [edge.sourcePersonId, edge.targetPersonId]) {
      if (seen.has(personId)) {
        continue;
      }
      seen.add(personId);
      ids.push(personId);
    }
  }
  return ids;
}

function capEdges(rows: EdgeRow[]): { rows: EdgeRow[]; truncated: boolean } {
  if (rows.length <= RELATIONSHIP_GRAPH_EDGE_CAP) {
    return { rows, truncated: false };
  }
  return { rows: rows.slice(0, RELATIONSHIP_GRAPH_EDGE_CAP), truncated: true };
}

async function loadMyself(db: GraphDb, userId: string): Promise<PersonNodeRow | null> {
  return db.people.findFirst({
    select: NODE_SELECT,
    where: { myself: true, userId },
  });
}

async function countUnlinked(db: GraphDb, userId: string): Promise<number> {
  return db.people.count({ where: unlinkedWhere(userId) });
}

async function listUnlinkedPreview(
  db: GraphDb,
  userId: string,
): Promise<RelationshipGraphUnlinkedPerson[]> {
  const rows = await db.people.findMany({
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
    select: UNLINKED_SELECT,
    take: UNLINKED_PREVIEW_LIMIT,
    where: unlinkedWhere(userId),
  });
  return rows.map(toUnlinked);
}

function buildGraph(input: {
  avatarOptions?: AvatarTransformOptions;
  edges: EdgeRow[];
  extraPersonIds: readonly string[];
  focusId?: string;
  groups: readonly GraphGroupInput[];
  hubs: readonly RelationshipGraphHub[];
  peopleById: Map<string, PersonNodeRow>;
  selfPerson: PersonNodeRow | null;
  truncated: boolean;
  unlinked: RelationshipGraphUnlinkedPerson[];
  unlinkedCount: number;
  userId: string;
}): RelationshipGraphResponse {
  const keptIds = new Set(input.peopleById.keys());
  const edges = input.edges.flatMap((edge) => {
    if (!keptIds.has(edge.sourcePersonId) || !keptIds.has(edge.targetPersonId)) {
      return [];
    }
    return [toEdge(edge)];
  });

  const linkedIds = new Set<string>();
  for (const edge of edges) {
    linkedIds.add(edge.sourcePersonId);
    linkedIds.add(edge.targetPersonId);
  }
  if (input.focusId) {
    linkedIds.add(input.focusId);
  }

  const nodes = orderedPersonIds(input.edges, input.focusId).flatMap((personId) => {
    if (!linkedIds.has(personId)) {
      return [];
    }
    const person = input.peopleById.get(personId);
    if (!person) {
      return [];
    }
    return [toNode(input.userId, person, input.avatarOptions)];
  });

  const seen = new Set(nodes.map((node) => node.id));
  for (const personId of input.extraPersonIds) {
    if (seen.has(personId)) {
      continue;
    }
    const person = input.peopleById.get(personId);
    if (!person) {
      continue;
    }
    seen.add(personId);
    nodes.push(toNode(input.userId, person, input.avatarOptions));
  }

  if (input.selfPerson && nodes.length > 0 && !seen.has(input.selfPerson.id)) {
    nodes.unshift(toNode(input.userId, input.selfPerson, input.avatarOptions));
  }

  let truncated = input.truncated;
  const hubs = input.hubs.flatMap((hub) => {
    const personIds = hub.personIds.filter((personId) => seen.has(personId));
    if (personIds.length < 2) {
      return [];
    }
    if (personIds.length < hub.memberCount) {
      truncated = true;
    }
    return [{ ...hub, personIds }];
  });
  const groups = selectGraphGroups({ canvasPersonIds: seen, groups: input.groups });

  return {
    graph: {
      edges,
      groups,
      hubs,
      nodes,
      truncated,
      unlinked: input.unlinked,
      unlinkedCount: input.unlinkedCount,
    },
  };
}

type GraphFlags = {
  includeGroups: boolean;
  includeHubs: boolean;
};

function graphFlags(query: { groups?: "1"; hubs?: "1" }): GraphFlags {
  return {
    includeGroups: query.groups === "1",
    includeHubs: query.hubs === "1",
  };
}

async function loadPeople(
  db: GraphDb,
  userId: string,
  ids: readonly string[],
): Promise<Map<string, PersonNodeRow>> {
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await db.people.findMany({
    select: NODE_SELECT,
    where: { id: { in: [...ids] }, userId },
  });
  return new Map(rows.map((row) => [row.id, row]));
}

export async function getRelationshipGraph(
  ctx: GraphContext,
  query: { focus?: string; groups?: "1"; hubs?: "1" },
  avatarOptions?: AvatarTransformOptions,
): Promise<RelationshipGraphResponse> {
  const db = domainDb(ctx as DomainContext);
  const userId = ctx.user.id;
  const flags = graphFlags(query);

  if (query.focus) {
    return getFocusedGraph(db, userId, query.focus, avatarOptions, flags);
  }
  return getGlobalGraph(db, userId, avatarOptions, flags);
}

async function getGlobalGraph(
  db: GraphDb,
  userId: string,
  avatarOptions: AvatarTransformOptions | undefined,
  flags: GraphFlags,
): Promise<RelationshipGraphResponse> {
  const [edgeRows, unlinkedCount, unlinked, overlays, selfPerson] = await Promise.all([
    db.peopleRelationship.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: EDGE_SELECT,
      take: RELATIONSHIP_GRAPH_EDGE_CAP + 1,
      where: { userId },
    }),
    countUnlinked(db, userId),
    listUnlinkedPreview(db, userId),
    loadOverlays(db, userId, flags),
    loadMyself(db, userId),
  ]);

  const capped = capEdges(edgeRows);
  let truncated = capped.truncated;
  let relationshipIds = orderedPersonIds(capped.rows);
  if (relationshipIds.length > RELATIONSHIP_GRAPH_NODE_CAP) {
    truncated = true;
    relationshipIds = relationshipIds.slice(0, RELATIONSHIP_GRAPH_NODE_CAP);
  }

  let hubs: RelationshipGraphHub[] = [];
  let extraPersonIds: string[] = [];
  if (flags.includeHubs) {
    const buckets = buildHubBuckets(overlays.work, overlays.education);
    const memberIds = new Set<string>();
    for (const hub of buckets.slice(0, RELATIONSHIP_GRAPH_HUB_CAP)) {
      for (const personId of hub.personIds) {
        memberIds.add(personId);
      }
    }
    const unlinkedPersonIds = await listUnlinkedIds(db, userId, [...memberIds]);
    const placed = placeHubsOnCanvas({
      admittedRelationshipIds: relationshipIds,
      hubs: buckets,
      nodeCap: RELATIONSHIP_GRAPH_NODE_CAP,
      unlinkedPersonIds,
    });
    if (placed.truncated) {
      truncated = true;
    }
    hubs = withHubLogos(userId, placed.hubs);
    const admitted = new Set(relationshipIds);
    extraPersonIds = placed.personIds.filter((personId) => !admitted.has(personId));
  }

  if (flags.includeGroups) {
    const placed = placeGroupMembersOnCanvas({
      admittedIds: [...relationshipIds, ...extraPersonIds],
      groups: overlays.groups,
      nodeCap: RELATIONSHIP_GRAPH_NODE_CAP,
    });
    truncated = truncated || placed.truncated;
    extraPersonIds = placed.personIds.filter((personId) => !relationshipIds.includes(personId));
  }

  const peopleById = await loadPeople(db, userId, [...relationshipIds, ...extraPersonIds]);
  if (selfPerson) {
    peopleById.set(selfPerson.id, selfPerson);
  }
  const kept = new Set(peopleById.keys());
  const edges = capped.rows.filter(
    (edge) => kept.has(edge.sourcePersonId) && kept.has(edge.targetPersonId),
  );

  return buildGraph({
    avatarOptions,
    edges,
    extraPersonIds,
    groups: overlays.groups,
    hubs,
    peopleById,
    selfPerson,
    truncated,
    unlinked,
    unlinkedCount,
    userId,
  });
}

async function getFocusedGraph(
  db: GraphDb,
  userId: string,
  focusId: string,
  avatarOptions: AvatarTransformOptions | undefined,
  flags: GraphFlags,
): Promise<RelationshipGraphResponse> {
  const focusPerson = await db.people.findFirst({
    select: NODE_SELECT,
    where: { id: focusId, userId },
  });

  if (!focusPerson) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const [edgeRows, unlinkedCount, overlays, selfPerson] = await Promise.all([
    db.peopleRelationship.findMany({
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: EDGE_SELECT,
      take: RELATIONSHIP_GRAPH_EDGE_CAP + 1,
      where: {
        OR: [{ sourcePersonId: focusId }, { targetPersonId: focusId }],
        userId,
      },
    }),
    countUnlinked(db, userId),
    loadOverlays(db, userId, flags),
    loadMyself(db, userId),
  ]);

  const capped = capEdges(edgeRows);
  let truncated = capped.truncated;
  let personIds = orderedPersonIds(capped.rows, focusId);
  if (personIds.length > RELATIONSHIP_GRAPH_NODE_CAP) {
    truncated = true;
    personIds = personIds.slice(0, RELATIONSHIP_GRAPH_NODE_CAP);
  }

  let hubs: RelationshipGraphHub[] = [];
  if (flags.includeHubs) {
    const placed = placeFocusHubs({
      hubs: buildHubBuckets(overlays.work, overlays.education),
      neighborhoodIds: new Set(personIds),
    });
    if (placed.truncated) {
      truncated = true;
    }
    hubs = withHubLogos(userId, placed.hubs);
  }

  const groupExtras = flags.includeGroups
    ? placeGroupMembersOnCanvas({
        admittedIds: personIds,
        groups: overlays.groups.filter((group) => group.personIds.includes(focusId)),
        nodeCap: RELATIONSHIP_GRAPH_NODE_CAP,
      })
    : { personIds, truncated: false };
  if (groupExtras.truncated) {
    truncated = true;
  }
  const extraPersonIds = groupExtras.personIds.filter((personId) => !personIds.includes(personId));

  const neighborIds = personIds.filter((personId) => personId !== focusId);
  const neighbors = await loadPeople(db, userId, [...neighborIds, ...extraPersonIds]);
  const peopleById = new Map<string, PersonNodeRow>([[focusPerson.id, focusPerson]]);
  for (const [personId, person] of neighbors) {
    peopleById.set(personId, person);
  }
  if (selfPerson) {
    peopleById.set(selfPerson.id, selfPerson);
  }

  const kept = new Set(peopleById.keys());
  const edges = capped.rows.filter(
    (edge) => kept.has(edge.sourcePersonId) && kept.has(edge.targetPersonId),
  );

  return buildGraph({
    avatarOptions,
    edges,
    extraPersonIds,
    focusId,
    groups: overlays.groups,
    hubs,
    peopleById,
    selfPerson,
    truncated,
    unlinked: [],
    unlinkedCount,
    userId,
  });
}
