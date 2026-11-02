"use client";

import { MenuDropdown, MenuTarget } from "@mantine/core";
import { IconArrowsSort } from "@tabler/icons-react";
import { useState } from "react";
import type { SortMenuLabels, SortOption } from "#DataTable/types.js";
import { DropdownOption, DropdownOptionMenu } from "#DropdownOption/index.js";
import { ToolbarMenuButton } from "#ToolbarMenuButton/ToolbarMenuButton.js";

export interface SortMenuProps<TSortKey extends string> {
  /** Currently selected sort key */
  currentSort: TSortKey;
  /** True when `currentSort` is not the caller's default sort. */
  isActive?: boolean;
  /** Localized labels */
  labels: SortMenuLabels;
  /** Callback when sort changes */
  onSortChange: (sortKey: TSortKey) => void;
  /** Available sort options */
  sortOptions: SortOption<TSortKey>[];
  /** Menu dropdown width */
  width?: number;
}

/**
 * Menu for selecting sort order from a list of options.
 * Generic over the sort key type for type safety.
 */
export function SortMenu<TSortKey extends string>({
  sortOptions,
  currentSort,
  isActive = false,
  onSortChange,
  labels,
  width = 220,
}: SortMenuProps<TSortKey>) {
  const [opened, setOpened] = useState(false);

  return (
    <DropdownOptionMenu onChange={setOpened} opened={opened} width={width}>
      <MenuTarget>
        <ToolbarMenuButton
          isActive={isActive}
          leftSection={<IconArrowsSort size={16} />}
          opened={opened}
        >
          {labels.buttonLabel}
        </ToolbarMenuButton>
      </MenuTarget>
      <MenuDropdown>
        {sortOptions.map((option) => (
          <DropdownOption
            key={option.key}
            label={option.label}
            onSelect={() => onSortChange(option.key)}
            selected={currentSort === option.key}
          />
        ))}
      </MenuDropdown>
    </DropdownOptionMenu>
  );
}
