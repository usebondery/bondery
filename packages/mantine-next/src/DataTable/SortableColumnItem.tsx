"use client";

import { Box, Checkbox, Group, Text } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

export interface SortableColumnItemColumn {
  /** Unique key for the column - used as sortable ID */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactNode;
  /** Whether column is visible */
  visible: boolean;
  /** If true, checkbox is disabled */
  fixed?: boolean;
}

export interface SortableColumnItemProps {
  /** Column configuration */
  column: SortableColumnItemColumn;
  /** Callback when visibility is toggled */
  onToggle: () => void;
}

/**
 * Draggable column item for column visibility menus.
 * Uses @dnd-kit/sortable for drag-and-drop reordering.
 */
export function SortableColumnItem({ column, onToggle }: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      p="xs"
      bg={isDragging ? "gray.1" : undefined}
    >
      <Group gap="xs" wrap="nowrap">
        <Box {...listeners} style={{ cursor: "grab", display: "flex", alignItems: "center" }}>
          <IconGripVertical size={16} />
        </Box>
        <Checkbox
          size="sm"
          checked={column.visible}
          label={
            <Group gap="xs" wrap="nowrap">
              {column.icon}
              <Text size="sm">{column.label}</Text>
            </Group>
          }
          onChange={onToggle}
          disabled={column.fixed}
          style={{ flex: 1 }}
        />
      </Group>
    </Box>
  );
}
