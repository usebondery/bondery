"use client";

import { useState } from "react";
import { Box, Button, Divider, Menu, MenuDropdown, MenuTarget, Text } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableColumnItem, type SortableColumnItemColumn } from "./SortableColumnItem";
import type { ColumnVisibilityLabels } from "./types";

export interface ColumnVisibilityMenuProps<TColumn extends SortableColumnItemColumn> {
  /** Array of column configurations */
  columns: TColumn[];
  /** Callback when columns change (visibility or order) */
  onColumnsChange: (columns: TColumn[]) => void;
  /** Localized labels for the menu */
  labels: ColumnVisibilityLabels;
  /** Menu dropdown width */
  width?: number;
}

/**
 * Menu for toggling column visibility and reordering columns via drag-and-drop.
 * Separates visible and hidden columns into two sections.
 */
export function ColumnVisibilityMenu<TColumn extends SortableColumnItemColumn>({
  columns,
  onColumnsChange,
  labels,
  width = 250,
}: ColumnVisibilityMenuProps<TColumn>) {
  const [opened, setOpened] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fixedColumns = columns.filter((col) => col.fixed);
  const visibleColumns = columns.filter((col) => col.visible && !col.fixed);
  const hiddenColumns = columns.filter((col) => !col.visible && !col.fixed);

  const handleDragEnd = (event: DragEndEvent, isVisible: boolean) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const currentFixed = columns.filter((col) => col.fixed);
    const currentVisible = columns.filter((col) => col.visible && !col.fixed);
    const currentHidden = columns.filter((col) => !col.visible && !col.fixed);

    const targetList = isVisible ? currentVisible : currentHidden;
    const oldIndex = targetList.findIndex((col) => col.key === active.id);
    const newIndex = targetList.findIndex((col) => col.key === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(targetList, oldIndex, newIndex);
    const otherList = isVisible ? currentHidden : currentVisible;

    const newColumns = isVisible
      ? [...currentFixed, ...reordered, ...otherList]
      : [...currentFixed, ...otherList, ...reordered];

    onColumnsChange(newColumns as TColumn[]);
  };

  const toggleColumn = (key: string) => {
    const newColumns = columns.map((col) =>
      col.key === key && !col.fixed ? { ...col, visible: !col.visible } : col,
    );
    onColumnsChange(newColumns as TColumn[]);
  };

  const buttonClassName = opened ? "button-scale-effect-active" : "button-scale-effect";

  return (
    <Menu width={width} opened={opened} onChange={setOpened}>
      <MenuTarget>
        <Button variant="light" leftSection={<IconEye size={16} />} className={buttonClassName}>
          {labels.buttonLabel}
        </Button>
      </MenuTarget>
      <MenuDropdown>
        <Box p="xs">
          <Text size="xs" fw={600} c="dimmed" mb="xs">
            {labels.visibleSection}
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
                  {labels.noVisible}
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
            {labels.hiddenSection}
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
                  {labels.noHidden}
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
