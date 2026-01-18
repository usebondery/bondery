"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

import type { Contact } from "@/lib/mockData";

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  color: string;
  initials: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface NetworkGraphProps {
  contacts: Contact[];
  height?: number;
  centerNodeId?: string;
}

export default function NetworkGraph({
  contacts,
  height = 400,
  centerNodeId,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || contacts.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    // Use container width
    const container = svgRef.current.parentElement;
    const width = container?.clientWidth || 800;

    // Map Mantine colors to hex
    const colorMap: Record<string, string> = {
      blue: "#228be6",
      green: "#40c057",
      pink: "#f06595",
      orange: "#fd7e14",
      violet: "#9775fa",
      cyan: "#22b8cf",
      teal: "#20c997",
      red: "#fa5252",
    };

    // Prepare nodes
    const nodes: GraphNode[] = contacts.map((contact) => ({
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}${
        contact.myself ? " (me)" : ""
      }`,
      color: contact.avatarColor,
      initials: `${contact.firstName[0]}${contact.lastName[0]}`,
    }));

    // Prepare links
    const links: GraphLink[] = [];
    contacts.forEach((contact) => {
      if (contact.connections) {
        contact.connections.forEach((targetId) => {
          // Only include links if both nodes are in the contacts list
          const targetExists = contacts.some((c) => c.id === targetId);
          if (!targetExists) return;

          // Avoid duplicate links
          const linkExists = links.some(
            (link) =>
              (link.source === contact.id && link.target === targetId) ||
              (link.source === targetId && link.target === contact.id)
          );
          if (!linkExists) {
            links.push({
              source: contact.id,
              target: targetId,
            });
          }
        });
      }
    });

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Create a group for all graph elements (enables zoom/pan)
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink<GraphNode, GraphLink>(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2);

    // Create nodes using foreignObject for custom HTML content
    const nodeWidth = 80;
    const nodeHeight = 70;

    const node = g
      .append("g")
      .selectAll("foreignObject")
      .data(nodes)
      .enter()
      .append("foreignObject")
      .attr("width", nodeWidth)
      .attr("height", nodeHeight)
      .attr("x", -nodeWidth / 2)
      .attr("y", -nodeHeight / 2)
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGForeignObjectElement, GraphNode>()
          .on("start", (event) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
          })
      );

    // Add custom HTML content to each node
    node
      .append("xhtml:div")
      .style("width", "100%")
      .style("height", "100%")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("cursor", "pointer")
      .html((d) => {
        const isCenter = centerNodeId && d.id === centerNodeId;
        const size = isCenter ? 50 : 40;
        const fontSize = isCenter ? 16 : 14;
        const borderWidth = isCenter ? 3 : 2;

        return `
            <div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background-color: ${colorMap[d.color] || "#228be6"};
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: ${fontSize}px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              border: ${borderWidth}px solid white;
            ">${d.initials}</div>
            <div style="
              margin-top: 4px;
              font-size: 11px;
              color: #333;
              text-align: center;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 80px;
              font-weight: ${isCenter ? "600" : "400"};
            ">${d.name}</div>
          `;
      });

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [contacts, height, centerNodeId]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <svg
        ref={svgRef}
        style={{
          width: "100%",
          height,
          border: "1px solid #e9ecef",
          borderRadius: "8px",
          display: "block",
        }}
      />
    </div>
  );
}
