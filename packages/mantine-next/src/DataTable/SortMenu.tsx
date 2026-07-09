"use client";

import { Button, Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconArrowsSort } from "@tabler/icons-react";
import { useState } from "react";
import type { SortMenuLabels, SortOption } from "#DataTable/types.js";

export interface SortMenuProps<TSortKey extends string> {
  /** Currently selected sort key */
  currentSort: TSortKey;
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
  onSortChange,
  labels,
  width = 220,
}: SortMenuProps<TSortKey>) {
  const [opened, setOpened] = useState(false);

  return (
    <Menu onChange={setOpened} opened={opened} shadow="md" width={width}>
      <MenuTarget>
        <Button
          className={opened ? "button-scale-effect-active" : undefined}
          leftSection={<IconArrowsSort size={16} />}
          variant="light"
        >
          {labels.buttonLabel}
        </Button>
      </MenuTarget>
      <MenuDropdown>
        {sortOptions.map((option) => (
          <MenuItem
            bg={currentSort === option.key ? "var(--mantine-primary-color-light)" : undefined}
            key={option.key}
            onClick={() => onSortChange(option.key)}
            rightSection={currentSort === option.key ? "✓" : ""}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuDropdown>
    </Menu>
  );
}
