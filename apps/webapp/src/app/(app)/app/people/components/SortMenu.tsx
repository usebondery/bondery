"use client";

import { Menu, Button, MenuTarget, MenuDropdown, MenuItem } from "@mantine/core";
import { useState } from "react";
import { IconArrowsSort } from "@tabler/icons-react";

export type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc";

interface SortMenuProps {
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
}

const sortOptions: { value: SortOrder; label: string }[] = [
  { value: "nameAsc", label: "Name A→Z" },
  { value: "nameDesc", label: "Name Z→A" },
  { value: "surnameAsc", label: "Surname A→Z" },
  { value: "surnameDesc", label: "Surname Z→A" },
  { value: "interactionDesc", label: "Newest interaction" },
  { value: "interactionAsc", label: "Oldest interaction" },
];

export function SortMenu({ sortOrder, setSortOrder }: SortMenuProps) {
  const [opened, setOpened] = useState(false);
  return (
    <Menu shadow="md" width={220} opened={opened} onChange={setOpened}>
      <MenuTarget>
        <Button
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
            onClick={() => setSortOrder(option.value)}
            rightSection={sortOrder === option.value ? "✓" : ""}
            bg={sortOrder === option.value ? "var(--mantine-primary-color-light)" : undefined}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuDropdown>
    </Menu>
  );
}
