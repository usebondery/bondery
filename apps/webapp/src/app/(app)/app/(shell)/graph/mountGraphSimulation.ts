import type { RelationshipGraphGroup, RelationshipGraphNode } from "@bondery/schemas";
import {
  drag,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Selection,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
  select,
} from "d3";
import type { RefObject } from "react";
import type { HubSimNode } from "./mountGraphOverlays";

export type PersonSim = SimulationNodeDatum & RelationshipGraphNode & { nodeKind: "person" };

export type GraphSimNode = PersonSim | HubSimNode;

export type GraphSimLink = SimulationLinkDatum<GraphSimNode> & {
  color: string;
  directed: boolean;
  hubId: string | null;
  key: string;
  kind: "relationship" | "self" | "spoke";
  personId?: string;
  sourcePersonId: string;
  targetPersonId: string;
};

type SavedPoint = {
  pinned: boolean;
  x: number;
  y: number;
};

function linkCoord(endpoint: GraphSimLink["source"], axis: "x" | "y"): number {
  if (typeof endpoint === "object" && endpoint) {
    return endpoint[axis] ?? 0;
  }
  return 0;
}

/** Relationship links stay stronger than spokes and the weak group pull. */
export function startGraphSimulation(input: {
  collideRadius: number;
  groups: RelationshipGraphGroup[];
  height: number;
  hub: Selection<SVGGElement, HubSimNode, SVGGElement, unknown>;
  link: Selection<SVGLineElement, GraphSimLink, SVGGElement, unknown>;
  node: Selection<SVGGElement, PersonSim, SVGGElement, unknown>;
  nodeById: Map<string, GraphSimNode>;
  nodeRadius: number;
  onTick: () => void;
  positionsRef: RefObject<Map<string, SavedPoint>>;
  simLinks: GraphSimLink[];
  simNodes: GraphSimNode[];
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  width: number;
}): Simulation<GraphSimNode, undefined> {
  const {
    collideRadius,
    groups,
    height,
    hub,
    link,
    node,
    nodeById,
    nodeRadius,
    onTick,
    positionsRef,
    simLinks,
    simNodes,
    svg,
    width,
  } = input;
  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<GraphSimNode, GraphSimLink>(simLinks)
        .id((row) => row.id)
        .distance((row) => (row.kind === "spoke" ? 150 : row.kind === "self" ? 130 : 96))
        .strength((row) => (row.kind === "spoke" ? 0.15 : row.kind === "self" ? 0.4 : 1)),
    )
    .force("charge", forceManyBody().strength(-180))
    .force("center", forceCenter(width / 2, height / 2))
    .force("collide", forceCollide(collideRadius));

  if (groups.length > 0) {
    simulation.force("groups", (alpha: number) => {
      const pull = 0.06 * alpha;
      for (const group of groups) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        const members: PersonSim[] = [];
        for (const personId of group.personIds) {
          const member = nodeById.get(personId);
          if (member?.nodeKind !== "person") {
            continue;
          }
          sumX += member.x ?? 0;
          sumY += member.y ?? 0;
          count += 1;
          members.push(member);
        }
        if (count === 0) {
          continue;
        }
        const centerX = sumX / count;
        const centerY = sumY / count;
        for (const member of members) {
          member.vx = (member.vx ?? 0) + (centerX - (member.x ?? centerX)) * pull;
          member.vy = (member.vy ?? 0) + (centerY - (member.y ?? centerY)) * pull;
        }
      }
    });
  }

  simulation.on("tick", () => {
    link
      .attr("x1", (row) => linkCoord(row.source, "x"))
      .attr("y1", (row) => linkCoord(row.source, "y"))
      .attr("x2", (row) => linkCoord(row.target, "x"))
      .attr("y2", (row) => linkCoord(row.target, "y"));
    node.each(function placeNode(row) {
      const x = row.x ?? 0;
      const y = row.y ?? 0;
      const group = select(this);
      group.select("circle.ring").attr("cx", x).attr("cy", y);
      group.select("circle.avatar").attr("cx", x).attr("cy", y);
      svg.select(`#graph-clip-${row.id} circle`).attr("cx", x).attr("cy", y);
      group
        .select("image")
        .attr("x", x - nodeRadius)
        .attr("y", y - nodeRadius);
      group.select("text.initials").attr("x", x).attr("y", y);
      group
        .select("text.graph-node-label")
        .attr("x", x)
        .attr("y", y + nodeRadius + 14);
    });
    onTick();
    for (const row of simNodes) {
      if (row.x == null || row.y == null) {
        continue;
      }
      const previous = positionsRef.current.get(row.id);
      positionsRef.current.set(row.id, {
        pinned: previous?.pinned === true || row.fx != null,
        x: row.x,
        y: row.y,
      });
    }
  });

  function bindPin<Datum extends GraphSimNode>(
    target: Selection<SVGGElement, Datum, SVGGElement, unknown>,
  ) {
    target.call(
      drag<SVGGElement, Datum>()
        .on("start", (event, row) => {
          event.sourceEvent.stopPropagation();
          if (!event.active) {
            simulation.alphaTarget(0.2).restart();
          }
          row.fx = row.x;
          row.fy = row.y;
        })
        .on("drag", (event, row) => {
          row.fx = event.x;
          row.fy = event.y;
        })
        .on("end", (event, row) => {
          if (!event.active) {
            simulation.alphaTarget(0);
          }
          const x = row.fx ?? row.x ?? 0;
          const y = row.fy ?? row.y ?? 0;
          positionsRef.current.set(row.id, { pinned: true, x, y });
        }),
    );
  }

  bindPin(node);
  bindPin(hub);
  return simulation;
}
