"use client";

import { useState } from "react";
import { Button, Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconArrowsSort } from "@tabler/icons-react";
import type { SortMenuLabels, SortOption } from "./types";

export interface SortMenuProps<TSortKey extends string> {
  /** Available sort options */
  sortOptions: SortOption<TSortKey>[];
  /** Currently selected sort key */
  currentSort: TSortKey;
  /** Callback when sort changes */
  onSortChange: (sortKey: TSortKey) => void;
  /** Localized labels */
  labels: SortMenuLabels;
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

  const buttonClassName = opened ? "button-scale-effect-active" : "button-scale-effect";

  return (
    <Menu shadow="md" width={width} opened={opened} onChange={setOpened}>
      <MenuTarget>
        <Button
          variant="light"
          leftSection={<IconArrowsSort size={16} />}
          className={buttonClassName}
        >
          {labels.buttonLabel}
        </Button>
      </MenuTarget>
      <MenuDropdown>
        {sortOptions.map((option) => (
          <MenuItem
            key={option.key}
            onClick={() => onSortChange(option.key)}
            rightSection={currentSort === option.key ? "✓" : ""}
            bg={currentSort === option.key ? "var(--mantine-primary-color-light)" : undefined}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuDropdown>
    </Menu>
  );
}
