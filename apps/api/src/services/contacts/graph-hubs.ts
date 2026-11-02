import type { RelationshipGraphGroup, RelationshipGraphHub } from "@bondery/schemas";
import { buildLinkedinLogoUrl } from "../../lib/storage/avatar-urls.js";

/** Company and school circles. They do not count toward the person cap. */
export const RELATIONSHIP_GRAPH_HUB_CAP = 40;

/** Group circles drawn behind the people. */
export const RELATIONSHIP_GRAPH_GROUP_HULL_CAP = 8;

const LEGAL_SUFFIXES = new Set([
  "co",
  "corp",
  "corporation",
  "gmbh",
  "inc",
  "incorporated",
  "limited",
  "llc",
  "llp",
  "lp",
  "ltd",
  "plc",
  "sa",
]);

const COMBINING_MARKS = /\p{M}/gu;
const NOT_NAME_CHAR = /[^\p{L}\p{N}\s]/gu;

export type WorkHistoryRow = {
  companyLinkedinId: string | null;
  companyName: string;
  endDate: Date | null;
  personId: string;
};

export type EducationHistoryRow = {
  personId: string;
  schoolLinkedinId: string | null;
  schoolName: string;
};

export type GraphGroupInput = {
  color: string | null;
  emoji: string | null;
  id: string;
  label: string;
  personIds: readonly string[];
};

type HubKind = RelationshipGraphHub["kind"];

/**
 * Trim, strip diacritics, and fold one trailing legal token.
 * Returns null when the name has no letters or digits left.
 */
export function normalizeHubName(raw: string): string | null {
  const stripped = raw.trim().normalize("NFD").replace(COMBINING_MARKS, "");
  const lowered = stripped.toLowerCase().replaceAll("&", " ");
  const collapsed = lowered.replace(NOT_NAME_CHAR, "").replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return null;
  }
  const words = collapsed.split(" ");
  if (words[0] === "the") {
    words.shift();
  }
  const last = words[words.length - 1];
  if (last && LEGAL_SUFFIXES.has(last)) {
    words.pop();
  }
  const name = words.join(" ").trim();
  return name.length > 0 ? name : null;
}

function linkedinId(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function companyHubKey(row: {
  companyLinkedinId: string | null;
  companyName: string;
}): string | null {
  const id = linkedinId(row.companyLinkedinId);
  if (id) {
    return `company:li:${id}`;
  }
  const name = normalizeHubName(row.companyName);
  if (!name) {
    return null;
  }
  return `company:name:${name}`;
}

export function schoolHubKey(row: {
  schoolLinkedinId: string | null;
  schoolName: string;
}): string | null {
  const id = linkedinId(row.schoolLinkedinId);
  if (id) {
    return `school:li:${id}`;
  }
  const name = normalizeHubName(row.schoolName);
  if (!name) {
    return null;
  }
  return `school:name:${name}`;
}

function chooseLabel(names: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const name of names) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best = names[0] ?? "";
  let bestCount = -1;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
      continue;
    }
    if (count < bestCount) {
      continue;
    }
    if (
      name.length < best.length ||
      (name.length === best.length && name.localeCompare(best) < 0)
    ) {
      best = name;
    }
  }
  return best;
}

type Bucket = {
  id: string;
  kind: HubKind;
  names: string[];
  people: Set<string>;
};

function addMember(
  buckets: Map<string, Bucket>,
  input: { id: string; kind: HubKind; personId: string; rawName: string },
): void {
  let bucket = buckets.get(input.id);
  if (!bucket) {
    bucket = { id: input.id, kind: input.kind, names: [], people: new Set() };
    buckets.set(input.id, bucket);
  }
  bucket.names.push(input.rawName);
  bucket.people.add(input.personId);
}

/**
 * Every job row and every school row. A hub exists only when two people share a key.
 * A LinkedIn id never joins a name-only bucket.
 */
export function buildHubBuckets(
  work: readonly WorkHistoryRow[],
  education: readonly EducationHistoryRow[],
): RelationshipGraphHub[] {
  const buckets = new Map<string, Bucket>();
  for (const row of work) {
    const id = companyHubKey(row);
    if (!id) {
      continue;
    }
    addMember(buckets, {
      id,
      kind: "company",
      personId: row.personId,
      rawName: row.companyName,
    });
  }
  for (const row of education) {
    const id = schoolHubKey(row);
    if (!id) {
      continue;
    }
    addMember(buckets, {
      id,
      kind: "school",
      personId: row.personId,
      rawName: row.schoolName,
    });
  }

  const hubs: RelationshipGraphHub[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.people.size < 2) {
      continue;
    }
    const personIds = [...bucket.people].sort((left, right) => left.localeCompare(right));
    hubs.push({
      id: bucket.id,
      kind: bucket.kind,
      label: chooseLabel(bucket.names),
      logoUrl: null,
      memberCount: bucket.people.size,
      personIds,
    });
  }
  hubs.sort((left, right) => {
    if (right.memberCount !== left.memberCount) {
      return right.memberCount - left.memberCount;
    }
    return left.id.localeCompare(right.id);
  });
  return hubs;
}

export type PlacedHubs = {
  hubs: RelationshipGraphHub[];
  personIds: string[];
  truncated: boolean;
};

/**
 * Relationship people stay first. Hub-only people fill the remaining person slots,
 * largest hub first. A hub with fewer than two people on the canvas is dropped.
 */
export function placeHubsOnCanvas(input: {
  admittedRelationshipIds: readonly string[];
  hubs: readonly RelationshipGraphHub[];
  nodeCap: number;
  unlinkedPersonIds: ReadonlySet<string>;
}): PlacedHubs {
  let truncated = input.hubs.length > RELATIONSHIP_GRAPH_HUB_CAP;
  const ranked = input.hubs.slice(0, RELATIONSHIP_GRAPH_HUB_CAP);
  const personIds = input.admittedRelationshipIds.slice(0, input.nodeCap);
  if (input.admittedRelationshipIds.length > input.nodeCap) {
    truncated = true;
  }
  const onCanvas = new Set(personIds);

  for (const hub of ranked) {
    if (personIds.length >= input.nodeCap) {
      break;
    }
    for (const personId of hub.personIds) {
      if (personIds.length >= input.nodeCap) {
        truncated = true;
        break;
      }
      if (!input.unlinkedPersonIds.has(personId) || onCanvas.has(personId)) {
        continue;
      }
      personIds.push(personId);
      onCanvas.add(personId);
    }
  }

  const hubs: RelationshipGraphHub[] = [];
  for (const hub of ranked) {
    const present = hub.personIds.filter((personId) => onCanvas.has(personId));
    if (present.length < 2) {
      continue;
    }
    if (present.length < hub.memberCount) {
      truncated = true;
    }
    hubs.push({ ...hub, personIds: present });
  }

  return { hubs, personIds, truncated };
}

/**
 * Focus keeps the neighborhood. A hub is drawn only when two neighbors already share it.
 */
export function placeFocusHubs(input: {
  hubs: readonly RelationshipGraphHub[];
  neighborhoodIds: ReadonlySet<string>;
}): { hubs: RelationshipGraphHub[]; truncated: boolean } {
  let truncated = input.hubs.length > RELATIONSHIP_GRAPH_HUB_CAP;
  const ranked = input.hubs.slice(0, RELATIONSHIP_GRAPH_HUB_CAP);
  const hubs: RelationshipGraphHub[] = [];
  for (const hub of ranked) {
    const personIds = hub.personIds.filter((personId) => input.neighborhoodIds.has(personId));
    if (personIds.length < 2) {
      continue;
    }
    if (personIds.length < hub.memberCount) {
      truncated = true;
    }
    hubs.push({ ...hub, personIds });
  }
  return { hubs, truncated };
}

/**
 * People already on the canvas stay. Other group members fill the remaining slots,
 * largest group first.
 */
export function placeGroupMembersOnCanvas(input: {
  admittedIds: readonly string[];
  groups: readonly GraphGroupInput[];
  nodeCap: number;
}): { personIds: string[]; truncated: boolean } {
  const personIds = input.admittedIds.slice(0, input.nodeCap);
  let truncated = input.admittedIds.length > input.nodeCap;
  const onCanvas = new Set(personIds);
  const ranked = [...input.groups].sort((left, right) => {
    if (right.personIds.length !== left.personIds.length) {
      return right.personIds.length - left.personIds.length;
    }
    return left.id.localeCompare(right.id);
  });

  for (const group of ranked) {
    for (const personId of group.personIds) {
      if (onCanvas.has(personId)) {
        continue;
      }
      if (personIds.length >= input.nodeCap) {
        truncated = true;
        break;
      }
      personIds.push(personId);
      onCanvas.add(personId);
    }
  }

  return { personIds, truncated };
}

const HUB_LINKEDIN_MARK = ":li:";

/** Logo URL for a hub whose id carries a LinkedIn company or school id. */
export function withHubLogos(userId: string, hubs: RelationshipGraphHub[]): RelationshipGraphHub[] {
  return hubs.map((hub) => {
    const mark = hub.id.indexOf(HUB_LINKEDIN_MARK);
    if (mark < 0) {
      return hub;
    }
    const linkedinId = hub.id.slice(mark + HUB_LINKEDIN_MARK.length);
    if (!linkedinId) {
      return hub;
    }
    return { ...hub, logoUrl: buildLinkedinLogoUrl(userId, linkedinId) };
  });
}

/** Groups with at least three people on the canvas. Largest membership, then id. */
export function selectGraphGroups(input: {
  canvasPersonIds: ReadonlySet<string>;
  groups: readonly GraphGroupInput[];
}): RelationshipGraphGroup[] {
  const ranked: RelationshipGraphGroup[] = [];
  for (const group of input.groups) {
    const personIds = [
      ...new Set(group.personIds.filter((personId) => input.canvasPersonIds.has(personId))),
    ].sort((left, right) => left.localeCompare(right));
    if (personIds.length < 3) {
      continue;
    }
    ranked.push({
      color: group.color,
      emoji: group.emoji,
      id: group.id,
      label: group.label,
      personIds,
    });
  }
  ranked.sort((left, right) => {
    if (right.personIds.length !== left.personIds.length) {
      return right.personIds.length - left.personIds.length;
    }
    return left.id.localeCompare(right.id);
  });
  return ranked.slice(0, RELATIONSHIP_GRAPH_GROUP_HULL_CAP);
}
