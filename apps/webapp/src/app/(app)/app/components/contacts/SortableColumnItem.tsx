"use client";

import { Box, Group, Checkbox } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ColumnConfig } from "@/app/(app)/app/components/ContactsTable";

interface SortableColumnItemProps {
  column: ColumnConfig;
  onToggle: () => void;
}

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
          checked={column.visible}
          label={
            <Group gap="xs" wrap="nowrap">
              {column.icon}
              <span>{column.label}</span>
            </Group>
          }
          onChange={onToggle}
          disabled={column.key === "name"}
          style={{ flex: 1 }}
        />
      </Group>
    </Box>
  );
}
