"use client";

import { Menu, Button, MenuTarget, MenuDropdown, MenuItem } from "@mantine/core";
import { useMemo, useState } from "react";
import { IconArrowsSort } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

export type SortOption = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

interface SortMenuProps {
  sortBy: SortOption;
  setSortBy: (option: SortOption) => void;
}

export function SortMenu({ sortBy, setSortBy }: SortMenuProps) {
  const t = useTranslations("GroupsPage.SortMenu");
  const [opened, setOpened] = useState(false);

  const sortOptions = useMemo(
    () =>
      [
        { value: "count-desc" as const, label: t("CountDesc") },
        { value: "count-asc" as const, label: t("CountAsc") },
        { value: "alpha-asc" as const, label: t("AlphaAsc") },
        { value: "alpha-desc" as const, label: t("AlphaDesc") },
      ],
    [t],
  );

  return (
    <Menu shadow="md" width={180} opened={opened} onChange={setOpened}>
      <MenuTarget>
        <Button
          size="md"
          variant="light"
          leftSection={<IconArrowsSort size={16} />}
          className={opened ? "button-scale-effect-active" : undefined}
        >
          {t("Label")}
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
