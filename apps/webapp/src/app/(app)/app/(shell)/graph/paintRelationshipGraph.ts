import { formatContactName } from "@bondery/helpers/contact";
import type { RelationshipGraphHub, RelationshipGraphNode } from "@bondery/schemas";
import { select } from "d3";
import type { CollapsedRelationshipEdge } from "./collapseRelationshipEdges";

type PaintNode = { id: string };
type PaintEdge = { key: string; sourcePersonId: string; targetPersonId: string };
type PaintHub = { id: string; label: string };
type PaintSpoke = { hubId: string; personId?: string };
type PaintSelfLink = { personId?: string; sourcePersonId: string };

const SECONDARY_FOCUS_OPACITY = 0.82;

type FocusInput = {
  edges: CollapsedRelationshipEdge[];
  hubs: RelationshipGraphHub[];
  nodes: RelationshipGraphNode[];
  selectedHubId: string | null;
  selectedNodeId: string | null;
};

function buildFocusIds(
  input: FocusInput,
  hoveredId: string | null,
  hoveredKind: string | null,
): Set<string> {
  const ids = new Set<string>();
  const owner = input.nodes.find((node) => node.myself);

  const addPerson = (personId: string) => {
    ids.add(personId);
    for (const edge of input.edges) {
      if (edge.sourcePersonId === personId || edge.targetPersonId === personId) {
        ids.add(edge.sourcePersonId);
        ids.add(edge.targetPersonId);
      }
    }
    for (const hub of input.hubs) {
      if (!hub.personIds.includes(personId)) {
        continue;
      }
      ids.add(hub.id);
      for (const memberId of hub.personIds) {
        ids.add(memberId);
      }
    }
    if (owner && personId !== owner.id) {
      ids.add(owner.id);
    }
  };

  const addHub = (hubId: string) => {
    ids.add(hubId);
    const hub = input.hubs.find((row) => row.id === hubId);
    if (!hub) {
      return;
    }
    for (const personId of hub.personIds) {
      ids.add(personId);
    }
  };

  const addOwnerWeb = (personId: string) => {
    if (!owner || personId !== owner.id) {
      return;
    }
    for (const node of input.nodes) {
      ids.add(node.id);
    }
    for (const hub of input.hubs) {
      ids.add(hub.id);
    }
  };

  if (hoveredId && hoveredKind === "hub") {
    addHub(hoveredId);
    return ids;
  }
  if (hoveredId) {
    addPerson(hoveredId);
    addOwnerWeb(hoveredId);
    return ids;
  }
  if (input.selectedNodeId) {
    addPerson(input.selectedNodeId);
    addOwnerWeb(input.selectedNodeId);
  }
  if (input.selectedHubId) {
    addHub(input.selectedHubId);
  }
  return ids;
}

export function paintRelationshipGraph(
  svgElement: SVGSVGElement,
  input: {
    edges: CollapsedRelationshipEdge[];
    hubs: RelationshipGraphHub[];
    nodes: RelationshipGraphNode[];
    markerRoot: ParentNode | null;
    searchQuery: string;
    selectedEdgeKey: string | null;
    selectedHubId: string | null;
    selectedNodeId: string | null;
  },
): void {
  const query = input.searchQuery.trim().toLocaleLowerCase();
  const root = select(svgElement);
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const hubMatchIds = new Set(
    input.hubs
      .filter((hub) => {
        if (!query) {
          return true;
        }
        if (hub.label.toLocaleLowerCase().includes(query)) {
          return true;
        }
        return hub.personIds.some((personId) => {
          const person = nodesById.get(personId);
          return person ? formatContactName(person).toLocaleLowerCase().includes(query) : false;
        });
      })
      .map((hub) => hub.id),
  );
  const matchIds = new Set(
    input.nodes
      .filter((node) => !query || formatContactName(node).toLocaleLowerCase().includes(query))
      .map((node) => node.id),
  );
  let hoveredId: string | null = null;
  let hoveredKind: string | null = null;
  const hoveredMarker = input.markerRoot?.querySelector("[data-graph-hovered='true']");
  if (hoveredMarker instanceof Element) {
    hoveredId = hoveredMarker.getAttribute("data-graph-id");
    hoveredKind = hoveredMarker.getAttribute("data-graph-kind");
  }
  if (!hoveredId) {
    root.selectAll<SVGGElement, PaintNode>(".graph-node").each(function readHover(row) {
      if (select(this).classed("is-hovered")) {
        hoveredId = row.id;
        hoveredKind = "person";
      }
    });
  }
  const focusIds = buildFocusIds(input, hoveredId, hoveredKind);
  const primaryId = hoveredId ?? input.selectedNodeId ?? input.selectedHubId;

  const memberOpacity = (id: string, matches: boolean) => {
    if (query && !matches) {
      return 0.12;
    }
    if (focusIds.size === 0 || id === primaryId) {
      return 1;
    }
    if (focusIds.has(id)) {
      return SECONDARY_FOCUS_OPACITY;
    }
    return 0.18;
  };

  const linkOpacity = (sourceId: string, targetId: string, bothMatch: boolean) => {
    if (query && !bothMatch) {
      return 0.12;
    }
    if (focusIds.size === 0) {
      return 1;
    }
    if (!focusIds.has(sourceId) || !focusIds.has(targetId)) {
      return 0.18;
    }
    if (sourceId === primaryId || targetId === primaryId) {
      return 1;
    }
    return SECONDARY_FOCUS_OPACITY;
  };

  root.selectAll<SVGGElement, PaintNode>(".graph-node").each(function paintNode(row) {
    const matches = matchIds.has(row.id);
    const inFocus = focusIds.size === 0 || focusIds.has(row.id);
    const selected = row.id === input.selectedNodeId;
    const opacity = memberOpacity(row.id, matches);
    select(this)
      .style("opacity", String(opacity))
      .classed("is-labeled", selected || inFocus)
      .classed("is-selected", selected);
    select(this)
      .select("circle.avatar")
      .attr(
        "stroke",
        selected ? "var(--mantine-color-blue-6)" : "var(--mantine-color-default-border)",
      )
      .attr("stroke-width", selected ? 2 : 1);
  });

  root.selectAll<SVGLineElement, PaintEdge>(".graph-edge").each(function paintEdge(row) {
    const bothMatch = matchIds.has(row.sourcePersonId) && matchIds.has(row.targetPersonId);
    const inFocus =
      focusIds.size === 0 || (focusIds.has(row.sourcePersonId) && focusIds.has(row.targetPersonId));
    const selected = row.key === input.selectedEdgeKey;
    const opacity = linkOpacity(row.sourcePersonId, row.targetPersonId, bothMatch);
    select(this)
      .style("opacity", String(selected ? 1 : opacity))
      .attr("stroke-width", selected || inFocus ? 2.5 : 1.25);
  });

  root.selectAll<SVGLineElement, PaintSelfLink>(".graph-self-link").each(function paintSelf(row) {
    const otherId = row.personId ?? "";
    const opacity = linkOpacity(row.sourcePersonId, otherId, !query || matchIds.has(otherId));
    select(this).style("opacity", String(opacity));
  });

  root.selectAll<SVGGElement, PaintHub>(".graph-hub").each(function paintHub(row) {
    const matches = !query || hubMatchIds.has(row.id);
    const selected = row.id === input.selectedHubId;
    const opacity = memberOpacity(row.id, matches);
    select(this).style("opacity", String(opacity));
    select(this)
      .select("circle")
      .attr("stroke-width", selected ? 3 : 1.5);
  });

  root.selectAll<SVGLineElement, PaintSpoke>(".graph-spoke").each(function paintSpoke(row) {
    const hubMatches = !query || hubMatchIds.has(row.hubId);
    const personMatches = !query || (row.personId ? matchIds.has(row.personId) : false);
    const selected = row.hubId === input.selectedHubId;
    const opacity = linkOpacity(row.hubId, row.personId ?? "", hubMatches || personMatches);
    select(this)
      .style("opacity", String(opacity))
      .attr("stroke-width", selected ? 2.25 : 1.25);
  });

  root.selectAll<SVGGElement, { id: string }>(".graph-hull").style("opacity", query ? 0.35 : 1);

  input.markerRoot?.querySelectorAll<HTMLElement>("[data-graph-id]").forEach((element) => {
    const id = element.dataset.graphId;
    if (!id) {
      return;
    }
    const kind = element.dataset.graphKind;
    const matches = kind === "hub" ? !query || hubMatchIds.has(id) : matchIds.has(id);
    const opacity = memberOpacity(id, matches);
    element.style.opacity = String(opacity);
  });
}
