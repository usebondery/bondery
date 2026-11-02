import type {
  RelationshipGraphGroup,
  RelationshipGraphHub,
  RelationshipGraphNode,
} from "@bondery/schemas";
import type { ZoomBehavior, ZoomTransform } from "d3";
import { select, zoom, zoomIdentity } from "d3";
import type { RefObject } from "react";
import {
  type CollapsedRelationshipEdge,
  RELATIONSHIP_FAMILIES,
  relationshipFamily,
} from "./collapseRelationshipEdges";
import { groupCircle, pushOutsideCircles } from "./graphHull";
import { createGraphViewControls, type RelationshipGraphControls } from "./graphViewControls";
import {
  COMPANY_HUB_COLOR,
  type HubSimNode,
  mountGraphOverlays,
  SCHOOL_HUB_COLOR,
} from "./mountGraphOverlays";
import {
  type GraphSimLink,
  type GraphSimNode,
  type PersonSim,
  startGraphSimulation,
} from "./mountGraphSimulation";

const NODE_RADIUS = 18;
const GROUP_CIRCLE_PAD = NODE_RADIUS + 14;

function dragPointForPerson(
  personId: string,
  x: number,
  y: number,
  groups: RelationshipGraphGroup[],
  nodeById: Map<string, GraphSimNode>,
): { x: number; y: number } {
  const circles = [];
  for (const group of groups) {
    if (group.personIds.includes(personId)) {
      continue;
    }
    const points: [number, number][] = [];
    for (const memberId of group.personIds) {
      const member = nodeById.get(memberId);
      if (member?.x == null || member.y == null) {
        continue;
      }
      points.push([member.x, member.y]);
    }
    const circle = groupCircle(points, GROUP_CIRCLE_PAD);
    if (circle) {
      circles.push(circle);
    }
  }
  return pushOutsideCircles(x, y, circles);
}

const FAMILY_COLOR = {
  family: "var(--mantine-color-blue-6)",
  friends: "var(--mantine-color-teal-6)",
  other: "var(--mantine-color-gray-6)",
  partners: "var(--mantine-color-pink-6)",
  work: "var(--mantine-color-orange-6)",
} as const;

export type { RelationshipGraphControls };

type SavedPoint = {
  pinned: boolean;
  x: number;
  y: number;
};

function edgeColor(edge: CollapsedRelationshipEdge): string {
  for (const family of RELATIONSHIP_FAMILIES) {
    if (edge.relationshipTypes.some((type) => relationshipFamily(type) === family)) {
      return FAMILY_COLOR[family];
    }
  }
  return FAMILY_COLOR.other;
}

export type GraphMarkerDrag = {
  end: (id: string) => void;
  move: (id: string, clientX: number, clientY: number) => void;
  start: (id: string, clientX: number, clientY: number) => void;
};

type GraphHandlers = {
  onClearSelection: () => void;
  onHover: (personId: string | null) => void;
  onOpenPerson: (personId: string) => void;
  onSelectEdge: (edgeKey: string, personId: string) => void;
  onSelectHub: (hubId: string) => void;
  onSelectNode: (personId: string) => void;
  searchQuery: string;
  selectedEdgeKey: string | null;
  selectedHubId: string | null;
  selectedNodeId: string | null;
};

export function mountRelationshipGraph(input: {
  ariaLabel: string;
  controlsRef: RefObject<RelationshipGraphControls | null>;
  edges: CollapsedRelationshipEdge[];
  dragRef: RefObject<GraphMarkerDrag | null>;
  groups: RelationshipGraphGroup[];
  handlersRef: RefObject<GraphHandlers>;
  host: HTMLDivElement;
  hubs: RelationshipGraphHub[];
  markerLayer: HTMLElement;
  nodes: RelationshipGraphNode[];
  positionsRef: RefObject<Map<string, SavedPoint>>;
  setMarkerHost: (node: HTMLDivElement | null) => void;
  svgRef: RefObject<SVGSVGElement | null>;
}): () => void {
  const {
    ariaLabel,
    controlsRef,
    dragRef,
    edges,
    groups,
    handlersRef,
    host,
    hubs,
    markerLayer,
    nodes,
    positionsRef,
    setMarkerHost,
    svgRef,
  } = input;
  const width = host.clientWidth || 800;
  const height = host.clientHeight || 600;
  const svg = select(host)
    .append("svg")
    .attr("aria-label", ariaLabel)
    .attr("height", "100%")
    .attr("role", "img")
    .attr("width", "100%")
    .style("display", "block")
    .style("touch-action", "none");
  const svgElement = svg.node();
  if (!svgElement) {
    return () => undefined;
  }
  svgRef.current = svgElement;
  const background = svg
    .append("rect")
    .attr("class", "graph-background")
    .attr("fill", "transparent")
    .attr("height", "100%")
    .attr("width", "100%")
    .style("cursor", "grab");
  const viewport = svg.append("g").attr("class", "viewport");
  const defs = svg.insert("defs", ":first-child");
  defs
    .append("marker")
    .attr("id", "relationship-graph-arrow")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", NODE_RADIUS + 10)
    .attr("refY", 5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 0 0 L 10 5 L 0 10 z")
    .attr("fill", "context-stroke");

  const personNodes: PersonSim[] = nodes.map((node) => {
    const saved = positionsRef.current.get(node.id);
    return {
      ...node,
      fx: saved?.pinned ? saved.x : null,
      fy: saved?.pinned ? saved.y : null,
      nodeKind: "person",
      x: saved?.x ?? (node.myself ? width / 2 : width / 2 + (Math.random() - 0.5) * 120),
      y: saved?.y ?? (node.myself ? height / 2 : height / 2 + (Math.random() - 0.5) * 120),
    };
  });
  const hubNodes: HubSimNode[] = hubs.map((hub) => {
    const saved = positionsRef.current.get(hub.id);
    return {
      fx: saved?.pinned ? saved.x : null,
      fy: saved?.pinned ? saved.y : null,
      hubKind: hub.kind,
      id: hub.id,
      label: hub.label,
      nodeKind: "hub",
      x: saved?.x ?? width / 2 + (Math.random() - 0.5) * 160,
      y: saved?.y ?? height / 2 + (Math.random() - 0.5) * 160,
    };
  });
  const simNodes: GraphSimNode[] = [...personNodes, ...hubNodes];
  const nodeById = new Map(simNodes.map((node) => [node.id, node]));
  const relationshipLinks: GraphSimLink[] = edges.flatMap((edge) => {
    if (!nodeById.has(edge.sourcePersonId) || !nodeById.has(edge.targetPersonId)) {
      return [];
    }
    return [
      {
        color: edgeColor(edge),
        directed: edge.directed,
        hubId: null,
        key: edge.key,
        kind: "relationship" as const,
        source: edge.sourcePersonId,
        sourcePersonId: edge.sourcePersonId,
        target: edge.targetPersonId,
        targetPersonId: edge.targetPersonId,
      },
    ];
  });
  const spokeLinks: Array<GraphSimLink & { hubId: string; personId: string }> = hubs.flatMap(
    (hub) => {
      const color = hub.kind === "company" ? COMPANY_HUB_COLOR : SCHOOL_HUB_COLOR;
      return hub.personIds.flatMap((personId) => {
        if (!nodeById.has(hub.id) || !nodeById.has(personId)) {
          return [];
        }
        return [
          {
            color,
            directed: false,
            hubId: hub.id,
            key: `${hub.id}\0${personId}`,
            kind: "spoke" as const,
            personId,
            source: hub.id,
            sourcePersonId: hub.id,
            target: personId,
            targetPersonId: personId,
          },
        ];
      });
    },
  );
  const owner = personNodes.find((node) => node.myself) ?? null;
  const selfLinks: GraphSimLink[] = owner
    ? personNodes.flatMap((person) => {
        if (person.id === owner.id) {
          return [];
        }
        return [
          {
            color: "var(--mantine-color-gray-5)",
            directed: false,
            hubId: null,
            key: `self\0${owner.id}\0${person.id}`,
            kind: "self" as const,
            personId: person.id,
            source: owner.id,
            sourcePersonId: owner.id,
            target: person.id,
            targetPersonId: person.id,
          },
        ];
      })
    : [];
  const simLinks = [...relationshipLinks, ...selfLinks, ...spokeLinks];
  const overlay = mountGraphOverlays({
    groups,
    nodeById,
    pad: GROUP_CIRCLE_PAD,
    spokeLinks,
    viewport,
  });

  const link = viewport
    .append("g")
    .attr("class", "edges")
    .selectAll<SVGLineElement, GraphSimLink>("line")
    .data([...selfLinks, ...relationshipLinks], (row) => row.key)
    .join("line")
    .attr("class", (row) => (row.kind === "self" ? "graph-self-link" : "graph-edge"))
    .attr("stroke", (row) => row.color)
    .attr("fill", "none")
    .style("cursor", (row) => (row.kind === "self" ? null : "pointer"))
    .style("pointer-events", (row) => (row.kind === "self" ? "none" : null));

  link.filter((row) => row.directed).attr("marker-end", "url(#relationship-graph-arrow)");

  const hub = overlay.appendHubs(hubNodes);

  const node = viewport
    .append("g")
    .attr("class", "nodes")
    .selectAll<SVGGElement, PersonSim>("g")
    .data(personNodes, (row) => row.id)
    .join("g")
    .attr("class", "graph-node")
    .style("pointer-events", "none");

  let currentTransform: ZoomTransform = zoomIdentity;
  const markerHost = document.createElement("div");
  markerHost.dataset.graphMarkers = "true";
  markerHost.style.position = "absolute";
  markerHost.style.left = "0";
  markerHost.style.top = "0";
  markerHost.style.width = "0";
  markerHost.style.height = "0";
  markerLayer.appendChild(markerHost);
  setMarkerHost(markerHost);

  function markerRoot(): HTMLElement | null {
    return markerHost;
  }

  function applyMarkerZoom(transform: ZoomTransform) {
    currentTransform = transform;
    const target = markerRoot();
    if (!target) {
      return;
    }
    // Transform.toString() is an SVG transform: translate(x,y) scale(k).
    // CSS translate() requires a length, so that string is dropped and the chips stay put.
    // apply() is (x * k + tx, y * k + ty). This CSS list matches it at origin 0 0.
    target.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`;
    target.style.transformOrigin = "0 0";
  }

  function placeMarkers() {
    const target = markerRoot();
    if (!target) {
      return;
    }
    const byId = new Map<string, HTMLElement>();
    for (const element of target.querySelectorAll<HTMLElement>("[data-graph-id]")) {
      const id = element.dataset.graphId;
      if (id) {
        byId.set(id, element);
      }
    }
    for (const row of simNodes) {
      if (row.x == null || row.y == null) {
        continue;
      }
      const element = byId.get(row.id);
      if (!element) {
        continue;
      }
      element.style.transform = `translate(${row.x}px, ${row.y}px) translate(-50%, -50%)`;
    }
  }

  function toSim(clientX: number, clientY: number): [number, number] {
    if (!svgElement) {
      return [0, 0];
    }
    const bounds = svgElement.getBoundingClientRect();
    const point = currentTransform.invert([clientX - bounds.left, clientY - bounds.top]);
    return [point[0], point[1]];
  }

  const simulation = startGraphSimulation({
    collideRadius: NODE_RADIUS + 12,
    groups,
    height,
    hub,
    link,
    node,
    nodeById,
    nodeRadius: NODE_RADIUS,
    onTick: () => {
      overlay.tick();
      placeMarkers();
    },
    positionsRef,
    simLinks,
    simNodes,
    svg,
    width,
  });

  function pinFromPointer(row: GraphSimNode, clientX: number, clientY: number) {
    let [x, y] = toSim(clientX, clientY);
    if (row.nodeKind === "person") {
      const next = dragPointForPerson(row.id, x, y, groups, nodeById);
      x = next.x;
      y = next.y;
    }
    row.fx = x;
    row.fy = y;
  }

  dragRef.current = {
    end(id) {
      simulation.alphaTarget(0);
      const row = nodeById.get(id);
      if (!row) {
        return;
      }
      const x = row.fx ?? row.x ?? 0;
      const y = row.fy ?? row.y ?? 0;
      positionsRef.current.set(id, { pinned: true, x, y });
    },
    move(id, clientX, clientY) {
      const row = nodeById.get(id);
      if (!row) {
        return;
      }
      pinFromPointer(row, clientX, clientY);
    },
    start(id, clientX, clientY) {
      const row = nodeById.get(id);
      if (!row) {
        return;
      }
      simulation.alphaTarget(0.2).restart();
      pinFromPointer(row, clientX, clientY);
    },
  };

  link.on("click", (event, row) => {
    if (row.kind === "self") {
      return;
    }
    event.stopPropagation();
    handlersRef.current.onSelectEdge(row.key, row.sourcePersonId);
  });

  svg.select("rect.graph-background").on("click", () => {
    handlersRef.current.onClearSelection();
  });

  const behavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .filter((event: Event) => {
      if (event.type === "dblclick") {
        return false;
      }
      if (event.type === "wheel") {
        return true;
      }
      const target = event.target;
      return target instanceof Element && target.classList.contains("graph-background");
    })
    .on("start", (event) => {
      const type = event.sourceEvent?.type;
      if (type === "mousedown" || type === "pointerdown" || type === "touchstart") {
        background.style("cursor", "grabbing");
        document.documentElement.style.cursor = "grabbing";
      }
    })
    .on("zoom", (event) => {
      viewport.attr("transform", event.transform.toString());
      applyMarkerZoom(event.transform);
    })
    .on("end", () => {
      background.style("cursor", "grab");
      document.documentElement.style.cursor = "";
    });

  svg.call(behavior);

  controlsRef.current = createGraphViewControls({
    behavior,
    getTransform: () => currentTransform,
    personNodes,
    simNodes,
    svgElement,
  });

  let fitted = false;
  simulation.on("end.fit", () => {
    if (fitted) {
      return;
    }
    fitted = true;
    controlsRef.current?.fit();
  });

  return () => {
    simulation.stop();
    document.documentElement.style.cursor = "";
    controlsRef.current = null;
    dragRef.current = null;
    setMarkerHost(null);
    markerHost.remove();
    svg.on(".zoom", null);
    svg.remove();
    svgRef.current = null;
  };
}
