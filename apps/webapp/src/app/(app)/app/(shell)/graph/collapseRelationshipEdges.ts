import type { RelationshipType } from "@bondery/schemas";

export const RELATIONSHIP_FAMILIES = ["family", "partners", "friends", "work", "other"] as const;

export type RelationshipFamily = (typeof RELATIONSHIP_FAMILIES)[number];

export type RelationshipGraphEdgeInput = {
  id: string;
  relationshipType: RelationshipType;
  sourcePersonId: string;
  targetPersonId: string;
};

export type CollapsedRelationshipEdge = {
  directed: boolean;
  key: string;
  relationshipTypes: RelationshipType[];
  sourcePersonId: string;
  targetPersonId: string;
};

export function relationshipFamily(type: RelationshipType): RelationshipFamily {
  switch (type) {
    case "parent":
    case "child":
    case "sibling":
    case "guardian":
    case "dependent":
      return "family";
    case "spouse":
    case "partner":
      return "partners";
    case "friend":
    case "neighbor":
      return "friends";
    case "colleague":
      return "work";
    default:
      return "other";
  }
}

/** Stable id for one visual line, independent of stored direction. */
export function relationshipPairKey(leftId: string, rightId: string): string {
  return leftId < rightId ? `${leftId}\0${rightId}` : `${rightId}\0${leftId}`;
}

function directedEnds(
  type: RelationshipType,
  sourcePersonId: string,
  targetPersonId: string,
): { sourcePersonId: string; targetPersonId: string } | null {
  if (type === "parent" || type === "guardian") {
    return { sourcePersonId, targetPersonId };
  }
  if (type === "child" || type === "dependent") {
    return { sourcePersonId: targetPersonId, targetPersonId: sourcePersonId };
  }
  return null;
}

/**
 * One line per person pair. Parent/child and guardian/dependent point from the
 * parent or guardian toward the child or dependent. The type list keeps both words.
 */
export function collapseRelationshipEdges(
  edges: readonly RelationshipGraphEdgeInput[],
): CollapsedRelationshipEdge[] {
  const groups = new Map<
    string,
    {
      directed: { sourcePersonId: string; targetPersonId: string } | null;
      firstSourcePersonId: string;
      firstTargetPersonId: string;
      relationshipTypes: RelationshipType[];
    }
  >();

  for (const edge of edges) {
    const key = relationshipPairKey(edge.sourcePersonId, edge.targetPersonId);
    let group = groups.get(key);
    if (!group) {
      group = {
        directed: null,
        firstSourcePersonId: edge.sourcePersonId,
        firstTargetPersonId: edge.targetPersonId,
        relationshipTypes: [],
      };
      groups.set(key, group);
    }
    if (!group.relationshipTypes.includes(edge.relationshipType)) {
      group.relationshipTypes.push(edge.relationshipType);
    }
    if (!group.directed) {
      group.directed = directedEnds(
        edge.relationshipType,
        edge.sourcePersonId,
        edge.targetPersonId,
      );
    }
  }

  return [...groups.entries()].map(([key, group]) => ({
    directed: group.directed !== null,
    key,
    relationshipTypes: group.relationshipTypes,
    sourcePersonId: group.directed?.sourcePersonId ?? group.firstSourcePersonId,
    targetPersonId: group.directed?.targetPersonId ?? group.firstTargetPersonId,
  }));
}
