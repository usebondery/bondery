"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Checkbox, Group, Text } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface SortableColumnItemColumn {
  /** If true, checkbox is disabled */
  fixed?: boolean;
  /** Optional icon */
  icon?: ReactNode;
  /** Unique key for the column - used as sortable ID */
  key: string;
  /** Display label */
  label: string;
  /** Whether column is visible */
  visible: boolean;
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
    opacity: isDragging ? 0.5 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      bg={isDragging ? "gray.1" : undefined}
      p="xs"
    >
      <Group gap="xs" wrap="nowrap">
        <Box {...listeners} style={{ alignItems: "center", cursor: "grab", display: "flex" }}>
          <IconGripVertical size={16} />
        </Box>
        <Checkbox
          checked={column.visible}
          disabled={column.fixed}
          label={
            <Group gap="xs" wrap="nowrap">
              {column.icon}
              <Text size="sm">{column.label}</Text>
            </Group>
          }
          onChange={onToggle}
          size="sm"
          style={{ flex: 1 }}
        />
      </Group>
    </Box>
  );
}
