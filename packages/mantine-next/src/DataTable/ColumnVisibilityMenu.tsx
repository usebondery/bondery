"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box, Button, Divider, Menu, MenuDropdown, MenuTarget, Text } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { useState } from "react";
import {
  SortableColumnItem,
  type SortableColumnItemColumn,
} from "#DataTable/SortableColumnItem.js";
import type { ColumnVisibilityLabels } from "#DataTable/types.js";

export interface ColumnVisibilityMenuProps<TColumn extends SortableColumnItemColumn> {
  /** Array of column configurations */
  columns: TColumn[];
  /** Localized labels for the menu */
  labels: ColumnVisibilityLabels;
  /** Callback when columns change (visibility or order) */
  onColumnsChange: (columns: TColumn[]) => void;
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

  const _fixedColumns = columns.filter((col) => col.fixed);
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

  return (
    <Menu onChange={setOpened} opened={opened} width={width}>
      <MenuTarget>
        <Button
          className={opened ? "button-scale-effect-active" : undefined}
          leftSection={<IconEye size={16} />}
          variant="light"
        >
          {labels.buttonLabel}
        </Button>
      </MenuTarget>
      <MenuDropdown>
        <Box p="xs">
          <Text c="dimmed" fw={600} mb="xs" size="xs">
            {labels.visibleSection}
          </Text>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, true)}
            sensors={sensors}
          >
            <SortableContext
              items={visibleColumns.map((c) => c.key)}
              strategy={verticalListSortingStrategy}
            >
              {visibleColumns.length === 0 ? (
                <Text c="dimmed" py="sm" size="sm" ta="center">
                  {labels.noVisible}
                </Text>
              ) : (
                visibleColumns.map((column) => (
                  <SortableColumnItem
                    column={column}
                    key={column.key}
                    onToggle={() => toggleColumn(column.key)}
                  />
                ))
              )}
            </SortableContext>
          </DndContext>

          <Divider my="sm" />

          <Text c="dimmed" fw={600} mb="xs" size="xs">
            {labels.hiddenSection}
          </Text>
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd(e, false)}
            sensors={sensors}
          >
            <SortableContext
              items={hiddenColumns.map((c) => c.key)}
              strategy={verticalListSortingStrategy}
            >
              {hiddenColumns.length === 0 ? (
                <Text c="dimmed" py="sm" size="sm" ta="center">
                  {labels.noHidden}
                </Text>
              ) : (
                hiddenColumns.map((column) => (
                  <SortableColumnItem
                    column={column}
                    key={column.key}
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
