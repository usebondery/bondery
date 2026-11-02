// biome-ignore-all lint/nursery/useReactCompiler: handlers stay on a ref so d3 reads the latest callback
"use client";

import type {
  RelationshipGraphGroup,
  RelationshipGraphHub,
  RelationshipGraphNode,
} from "@bondery/schemas";
import { Box } from "@mantine/core";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CollapsedRelationshipEdge } from "./collapseRelationshipEdges";
import { GraphHubMarker, GraphPersonMarker } from "./GraphCanvasMarkers";
import {
  type GraphMarkerDrag,
  mountRelationshipGraph,
  type RelationshipGraphControls,
} from "./mountRelationshipGraph";
import { paintRelationshipGraph } from "./paintRelationshipGraph";

export type { RelationshipGraphControls };

interface RelationshipGraphProps {
  ariaLabel: string;
  clipRoot?: HTMLElement | null;
  controlsRef: RefObject<RelationshipGraphControls | null>;
  edges: CollapsedRelationshipEdge[];
  groups: RelationshipGraphGroup[];
  hubs: RelationshipGraphHub[];
  nodes: RelationshipGraphNode[];
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
}

/**
 * d3 writes positions onto the SVG and the HTML markers.
 * React state stays at hover and selection so a simulation tick does not re-render the page.
 */
export function RelationshipGraph({
  ariaLabel,
  clipRoot,
  controlsRef,
  edges,
  groups,
  hubs,
  nodes,
  onClearSelection,
  onHover,
  onOpenPerson,
  onSelectEdge,
  onSelectHub,
  onSelectNode,
  searchQuery,
  selectedEdgeKey,
  selectedHubId,
  selectedNodeId,
}: RelationshipGraphProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<GraphMarkerDrag | null>(null);
  const positionsRef = useRef(new Map<string, { pinned: boolean; x: number; y: number }>());
  const [markerHost, setMarkerHost] = useState<HTMLDivElement | null>(null);
  const handlersRef = useRef({
    onClearSelection,
    onHover,
    onOpenPerson,
    onSelectEdge,
    onSelectHub,
    onSelectNode,
    searchQuery,
    selectedEdgeKey,
    selectedHubId,
    selectedNodeId,
  });
  handlersRef.current = {
    onClearSelection,
    onHover,
    onOpenPerson,
    onSelectEdge,
    onSelectHub,
    onSelectNode,
    searchQuery,
    selectedEdgeKey,
    selectedHubId,
    selectedNodeId,
  };

  useEffect(() => {
    const host = hostRef.current;
    const markerLayer = markerLayerRef.current;
    if (!host || !markerLayer) {
      return;
    }
    return mountRelationshipGraph({
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
    });
  }, [ariaLabel, controlsRef, edges, groups, hubs, nodes]);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) {
      return;
    }
    paintRelationshipGraph(svgElement, {
      edges,
      hubs,
      markerRoot: markerLayerRef.current,
      nodes,
      searchQuery,
      selectedEdgeKey,
      selectedHubId,
      selectedNodeId,
    });
  }, [edges, hubs, nodes, searchQuery, selectedEdgeKey, selectedHubId, selectedNodeId]);

  useLayoutEffect(() => {
    if (!markerHost) {
      return;
    }
    const byId = new Map<string, HTMLElement>();
    for (const element of markerHost.querySelectorAll<HTMLElement>("[data-graph-id]")) {
      const id = element.dataset.graphId;
      if (id) {
        byId.set(id, element);
      }
    }
    for (const [id, point] of positionsRef.current) {
      const element = byId.get(id);
      if (!element) {
        continue;
      }
      element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    }
  });

  function paintHover(personId: string | null) {
    const markerRoot = markerLayerRef.current;
    if (markerRoot) {
      for (const element of markerRoot.querySelectorAll("[data-graph-hovered]")) {
        element.removeAttribute("data-graph-hovered");
      }
      if (personId) {
        for (const element of markerRoot.querySelectorAll<HTMLElement>("[data-graph-id]")) {
          if (element.dataset.graphId === personId) {
            element.setAttribute("data-graph-hovered", "true");
            break;
          }
        }
      }
    }
    const svgElement = svgRef.current;
    if (!svgElement) {
      onHover(personId);
      return;
    }
    const handlers = handlersRef.current;
    paintRelationshipGraph(svgElement, {
      edges,
      hubs,
      markerRoot,
      nodes,
      searchQuery: handlers.searchQuery,
      selectedEdgeKey: handlers.selectedEdgeKey,
      selectedHubId: handlers.selectedHubId,
      selectedNodeId: handlers.selectedNodeId,
    });
    onHover(personId);
  }

  return (
    <Box h="100%" pos="relative" w="100%">
      <Box h="100%" ref={hostRef} w="100%" />
      <Box
        ref={markerLayerRef}
        style={{ inset: 0, overflow: "hidden", pointerEvents: "none", position: "absolute" }}
      >
        {markerHost
          ? createPortal(
              <>
                {nodes.map((node) => (
                  <GraphPersonMarker
                    clipRoot={clipRoot}
                    dragRef={dragRef}
                    key={node.id}
                    node={node}
                    onHover={paintHover}
                    onOpen={onOpenPerson}
                    onSelect={onSelectNode}
                    selected={node.id === selectedNodeId}
                  />
                ))}
                {hubs.map((hub) => (
                  <GraphHubMarker
                    dragRef={dragRef}
                    hub={hub}
                    key={hub.id}
                    onHover={paintHover}
                    onSelect={onSelectHub}
                    selected={hub.id === selectedHubId}
                  />
                ))}
              </>,
              markerHost,
            )
          : null}
      </Box>
    </Box>
  );
}
