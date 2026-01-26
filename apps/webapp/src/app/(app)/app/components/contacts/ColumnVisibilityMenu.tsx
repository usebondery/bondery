"use client";

import { Menu, Button, Box, Text, Divider, MenuTarget, MenuDropdown } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableColumnItem } from "./SortableColumnItem";
import { ColumnConfig } from "@/app/(app)/app/components/ContactsTable";

interface ColumnVisibilityMenuProps {
  columns: ColumnConfig[];
  setColumns: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
}

export function ColumnVisibilityMenu({ columns, setColumns }: ColumnVisibilityMenuProps) {
  const [opened, setOpened] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visibleColumns = columns.filter((c) => c.visible && !c.fixed);
  const hiddenColumns = columns.filter((c) => !c.visible && !c.fixed);

  const handleDragEnd = (event: DragEndEvent, isVisible: boolean) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setColumns(() => {
      const targetColumns = isVisible ? visibleColumns : hiddenColumns;
      const oldIndex = targetColumns.findIndex((col) => col.key === active.id);
      const newIndex = targetColumns.findIndex((col) => col.key === over.id);

      const reordered = arrayMove(targetColumns, oldIndex, newIndex);

      const otherColumns = isVisible ? hiddenColumns : visibleColumns;
      return isVisible ? [...reordered, ...otherColumns] : [...visibleColumns, ...reordered];
    });
  };

  const toggleColumn = (key: string) => {
    setColumns((cols) =>
      cols.map((col) => (col.key === key && !col.fixed ? { ...col, visible: !col.visible } : col)),
    );
  };

  return (
    <Menu width={250} opened={opened} onChange={setOpened}>
      <MenuTarget>
        <Button
          variant="light"
          leftSection={<IconEye size={16} />}
          className={opened ? "button-scale-effect-active" : "button-scale-effect"}
        >
          Visible columns
        </Button>
      </MenuTarget>
      <MenuDropdown>
        <Box p="xs">
          <Text size="xs" fw={600} c="dimmed" mb="xs">
            Visible
          </Text>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, true)}
          >
            <SortableContext
              items={visibleColumns.map((c) => c.key)}
              strategy={verticalListSortingStrategy}
            >
              {visibleColumns.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="sm">
                  No visible columns
                </Text>
              ) : (
                visibleColumns.map((column) => (
                  <SortableColumnItem
                    key={column.key}
                    column={column}
                    onToggle={() => toggleColumn(column.key)}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>

          <Divider my="sm" />

          <Text size="xs" fw={600} c="dimmed" mb="xs">
            Hidden
          </Text>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, false)}
          >
            <SortableContext
              items={hiddenColumns.map((c) => c.key)}
              strategy={verticalListSortingStrategy}
            >
              {hiddenColumns.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="sm">
                  No hidden columns
                </Text>
              ) : (
                hiddenColumns.map((column) => (
                  <SortableColumnItem
                    key={column.key}
                    column={column}
                    onToggle={() => toggleColumn(column.key)}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>
        </Box>
      </MenuDropdown>
    </Menu>
  );
}
