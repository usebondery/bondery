"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { PersonAvatarTooltip } from "@bondery/mantine-next";
import type { RelationshipGraphHub, RelationshipGraphNode } from "@bondery/schemas";
import { Avatar, Group, Tooltip } from "@mantine/core";
import { IconBriefcase, IconSchool } from "@tabler/icons-react";
import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useRef } from "react";
import { PersonMapAvatarMarker } from "@/components/map/mapMarkerIcons";
import type { GraphMarkerDrag } from "./mountRelationshipGraph";
import "./graphMarkers.css";

const MARKER_BUTTON_STYLE = {
  background: "none",
  border: "none",
  cursor: "grab",
  padding: 0,
  pointerEvents: "auto",
  position: "absolute",
  touchAction: "none",
} as const;

function setDragCursor(active: boolean) {
  document.documentElement.style.cursor = active ? "grabbing" : "";
}

function useMarkerDrag(
  dragRef: RefObject<GraphMarkerDrag | null>,
  id: string,
  onSelect: () => void,
) {
  const moved = useRef(false);

  useEffect(() => {
    return () => {
      setDragCursor(false);
    };
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    moved.current = false;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = "grabbing";
    setDragCursor(true);
    dragRef.current?.start(id, event.clientX, event.clientY);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    if (Math.hypot(event.movementX, event.movementY) > 2) {
      moved.current = true;
    }
    dragRef.current?.move(id, event.clientX, event.clientY);
  }

  function releaseDrag(event: ReactPointerEvent<HTMLButtonElement>, selectChip: boolean) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.style.cursor = "grab";
    setDragCursor(false);
    dragRef.current?.end(id);
    if (selectChip && !moved.current) {
      onSelect();
    }
  }

  return {
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => releaseDrag(event, false),
    onPointerDown,
    onPointerMove,
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => releaseDrag(event, true),
  };
}

export function GraphPersonMarker(props: {
  clipRoot?: HTMLElement | null;
  dragRef: RefObject<GraphMarkerDrag | null>;
  node: RelationshipGraphNode;
  onHover: (personId: string | null) => void;
  onOpen: (personId: string) => void;
  onSelect: (personId: string) => void;
  selected: boolean;
}) {
  const { clipRoot, dragRef, node, onHover, onOpen, onSelect, selected } = props;
  const name = formatContactName(node);
  const drag = useMarkerDrag(dragRef, node.id, () => onSelect(node.id));

  return (
    <PersonAvatarTooltip
      clipRoot={clipRoot}
      opened={selected ? true : undefined}
      person={{
        avatar: node.avatar,
        firstName: node.firstName,
        headline: node.headline,
        id: node.id,
        lastName: node.lastName,
        location: node.location,
        middleName: node.middleName,
      }}
    >
      <button
        aria-label={name}
        className="graph-marker-button"
        data-graph-id={node.id}
        data-graph-kind="person"
        draggable={false}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpen(node.id);
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={drag.onPointerCancel}
        onPointerDown={drag.onPointerDown}
        onPointerEnter={() => onHover(node.id)}
        onPointerLeave={() => onHover(null)}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        style={MARKER_BUTTON_STYLE}
        type="button"
      >
        <PersonMapAvatarMarker
          avatarUrl={node.avatar}
          firstName={node.firstName}
          lastName={node.lastName}
          name={name}
        />
      </button>
    </PersonAvatarTooltip>
  );
}

export function GraphHubMarker(props: {
  dragRef: RefObject<GraphMarkerDrag | null>;
  hub: RelationshipGraphHub;
  onHover: (hubId: string | null) => void;
  onSelect: (hubId: string) => void;
  selected: boolean;
}) {
  const { dragRef, hub, onHover, onSelect, selected } = props;
  const drag = useMarkerDrag(dragRef, hub.id, () => onSelect(hub.id));

  return (
    <Tooltip
      label={
        <Group gap={6} wrap="nowrap">
          {hub.kind === "company" ? (
            <IconBriefcase size={14} stroke={1.5} />
          ) : (
            <IconSchool size={14} stroke={1.5} />
          )}
          <span>{hub.label}</span>
        </Group>
      }
      openDelay={120}
      position="top"
    >
      <button
        aria-label={hub.label}
        className="graph-marker-button"
        data-graph-id={hub.id}
        data-graph-kind="hub"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={drag.onPointerCancel}
        onPointerDown={drag.onPointerDown}
        onPointerEnter={() => onHover(hub.id)}
        onPointerLeave={() => onHover(null)}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        style={{
          ...MARKER_BUTTON_STYLE,
          borderRadius: 10,
          outline: selected ? "2px solid var(--mantine-color-blue-6)" : undefined,
        }}
        type="button"
      >
        <Avatar
          color={hub.kind === "company" ? "indigo" : "grape"}
          name={hub.label}
          radius="md"
          size={34}
          src={hub.logoUrl || undefined}
          style={{
            backgroundColor: "#fff",
            border: "3px solid #fff",
            boxShadow: "0 0 0 2px #fff, 0 1px 4px rgba(0, 0, 0, 0.25)",
          }}
        />
      </button>
    </Tooltip>
  );
}
