import type { RelationshipGraphGroup } from "@bondery/schemas";
import { type Selection, type SimulationLinkDatum, type SimulationNodeDatum, select } from "d3";
import { groupCaption, groupCircle, groupColor } from "./graphHull";

export const COMPANY_HUB_COLOR = "var(--mantine-color-indigo-6)";
export const SCHOOL_HUB_COLOR = "var(--mantine-color-grape-6)";

export type HubSimNode = SimulationNodeDatum & {
  hubKind: "company" | "school";
  id: string;
  label: string;
  nodeKind: "hub";
};

type PointNode = SimulationNodeDatum & { id: string };

export type SpokeSimLink = SimulationLinkDatum<PointNode> & {
  color: string;
  hubId: string;
  key: string;
  personId: string;
};

type Viewport = Selection<SVGGElement, unknown, null, undefined>;

function linkCoord(endpoint: SpokeSimLink["source"], axis: "x" | "y"): number {
  if (typeof endpoint === "object" && endpoint) {
    return endpoint[axis] ?? 0;
  }
  return 0;
}

/**
 * Group circles and spokes sit behind relationship lines.
 */
export function mountGraphOverlays(input: {
  groups: RelationshipGraphGroup[];
  nodeById: Map<string, PointNode>;
  pad: number;
  spokeLinks: SpokeSimLink[];
  viewport: Viewport;
}): {
  appendHubs: (hubNodes: HubSimNode[]) => Selection<SVGGElement, HubSimNode, SVGGElement, unknown>;
  tick: () => void;
} {
  const { groups, nodeById, pad, spokeLinks, viewport } = input;
  const hull = viewport
    .append("g")
    .attr("class", "hulls")
    .style("pointer-events", "none")
    .selectAll<SVGGElement, RelationshipGraphGroup>("g")
    .data(groups, (row) => row.id)
    .join("g")
    .attr("class", "graph-hull");

  hull.each(function drawHull(row) {
    const color = groupColor(row);
    const group = select(this);
    group
      .append("circle")
      .attr("fill", color)
      .attr("fill-opacity", 0.15)
      .attr("stroke", color)
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1.5);
    group
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("fill", "var(--mantine-color-text)")
      .attr("font-size", 12)
      .text(groupCaption(row));
  });

  const spokes = viewport
    .append("g")
    .attr("class", "spokes")
    .selectAll<SVGLineElement, SpokeSimLink>("line")
    .data(spokeLinks, (row) => row.key)
    .join("line")
    .attr("class", "graph-spoke")
    .attr("stroke", (row) => row.color)
    .attr("stroke-dasharray", "4 3")
    .attr("fill", "none")
    .style("pointer-events", "none");

  return {
    appendHubs(hubNodes) {
      return viewport
        .append("g")
        .attr("class", "hubs")
        .selectAll<SVGGElement, HubSimNode>("g")
        .data(hubNodes, (row) => row.id)
        .join("g")
        .attr("class", "graph-hub")
        .style("pointer-events", "none");
    },
    tick() {
      spokes
        .attr("x1", (row) => linkCoord(row.source, "x"))
        .attr("y1", (row) => linkCoord(row.source, "y"))
        .attr("x2", (row) => linkCoord(row.target, "x"))
        .attr("y2", (row) => linkCoord(row.target, "y"));
      hull.each(function placeHull(row) {
        const points: [number, number][] = [];
        for (const personId of row.personIds) {
          const node = nodeById.get(personId);
          if (node?.x == null || node.y == null) {
            continue;
          }
          points.push([node.x, node.y]);
        }
        const circle = groupCircle(points, pad);
        const group = select(this);
        if (!circle) {
          group.select("circle").attr("r", 0);
          return;
        }
        group.select("circle").attr("cx", circle.cx).attr("cy", circle.cy).attr("r", circle.r);
        group
          .select("text")
          .attr("x", circle.cx)
          .attr("y", circle.cy - circle.r - 14);
      });
    },
  };
}
