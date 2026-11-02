import type { ZoomBehavior, ZoomTransform } from "d3";
import { select, zoomIdentity } from "d3";
import type { GraphSimNode, PersonSim } from "./mountGraphSimulation";

export type RelationshipGraphControls = {
  centerMyself: () => void;
  fit: () => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

export function createGraphViewControls(input: {
  behavior: ZoomBehavior<SVGSVGElement, unknown>;
  getTransform: () => ZoomTransform;
  personNodes: PersonSim[];
  simNodes: GraphSimNode[];
  svgElement: SVGSVGElement;
}): RelationshipGraphControls {
  const { behavior, getTransform, personNodes, simNodes, svgElement } = input;
  const animateZoom = () => select(svgElement).transition().duration(180);

  return {
    centerMyself: () => {
      const ownerNode = personNodes.find((node) => node.myself);
      if (ownerNode?.x == null || ownerNode.y == null) {
        return;
      }
      const scale = getTransform().k;
      const boxWidth = svgElement.clientWidth;
      const boxHeight = svgElement.clientHeight;
      const transform = zoomIdentity
        .translate(boxWidth / 2 - ownerNode.x * scale, boxHeight / 2 - ownerNode.y * scale)
        .scale(scale);
      behavior.transform(animateZoom(), transform);
    },
    fit: () => {
      const boxWidth = svgElement.clientWidth;
      const boxHeight = svgElement.clientHeight;
      if (boxWidth === 0 || boxHeight === 0 || simNodes.length === 0) {
        return;
      }
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const row of simNodes) {
        const x = row.x ?? boxWidth / 2;
        const y = row.y ?? boxHeight / 2;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      const padding = 72;
      const scale = Math.min(
        2,
        Math.max(
          0.2,
          Math.min(
            (boxWidth - padding) / Math.max(maxX - minX, 1),
            (boxHeight - padding) / Math.max(maxY - minY, 1),
          ),
        ),
      );
      const transform = zoomIdentity
        .translate(boxWidth / 2, boxHeight / 2)
        .scale(scale)
        .translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
      behavior.transform(animateZoom(), transform);
    },
    resetZoom: () => {
      behavior.scaleTo(animateZoom(), 1);
    },
    zoomIn: () => {
      behavior.scaleBy(animateZoom(), 1.25);
    },
    zoomOut: () => {
      behavior.scaleBy(animateZoom(), 0.8);
    },
  };
}
