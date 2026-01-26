"use client";

import { Menu, Button, MenuTarget, MenuDropdown, MenuItem } from "@mantine/core";
import { useState } from "react";
import { IconArrowsSort } from "@tabler/icons-react";

export type SortOption = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

interface SortMenuProps {
  sortBy: SortOption;
  setSortBy: (option: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "count-desc", label: "Most people" },
  { value: "count-asc", label: "Least people" },
  { value: "alpha-asc", label: "A→Z" },
  { value: "alpha-desc", label: "Z→A" },
];

export function SortMenu({ sortBy, setSortBy }: SortMenuProps) {
  const [opened, setOpened] = useState(false);
  return (
    <Menu shadow="md" width={180} opened={opened} onChange={setOpened}>
      <MenuTarget>
        <Button
          size="md"
          variant="light"
          leftSection={<IconArrowsSort size={16} />}
          className={opened ? "button-scale-effect-active" : "button-scale-effect"}
        >
          Sort
        </Button>
      </MenuTarget>
      <MenuDropdown>
        {sortOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => setSortBy(option.value)}
            rightSection={sortBy === option.value ? "✓" : ""}
            bg={sortBy === option.value ? "var(--mantine-primary-color-light)" : undefined}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuDropdown>
    </Menu>
  );
}
