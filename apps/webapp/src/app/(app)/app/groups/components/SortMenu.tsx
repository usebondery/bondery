"use client";

import { Button, Menu, MenuDropdown, MenuItem, MenuTarget } from "@mantine/core";
import { IconArrowsSort } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useGroupsPageTranslations } from "@/lib/i18n/generated/hooks";

export type SortOption = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

interface SortMenuProps {
  setSortBy: (option: SortOption) => void;
  sortBy: SortOption;
}

export function SortMenu({ sortBy, setSortBy }: SortMenuProps) {
  const t = useGroupsPageTranslations("SortMenu");
  const [opened, setOpened] = useState(false);

  const sortOptions = useMemo(
    () => [
      { label: t("CountDesc"), value: "count-desc" as const },
      { label: t("CountAsc"), value: "count-asc" as const },
      { label: t("AlphaAsc"), value: "alpha-asc" as const },
      { label: t("AlphaDesc"), value: "alpha-desc" as const },
    ],
    [t],
  );

  return (
    <Menu onChange={setOpened} opened={opened} shadow="md" width={180}>
      <MenuTarget>
        <Button
          className={opened ? "button-scale-effect-active" : undefined}
          leftSection={<IconArrowsSort size={16} />}
          size="md"
          variant="light"
        >
          {t("Label")}
        </Button>
      </MenuTarget>
      <MenuDropdown>
        {sortOptions.map((option) => (
          <MenuItem
            bg={sortBy === option.value ? "var(--mantine-primary-color-light)" : undefined}
            key={option.value}
            onClick={() => setSortBy(option.value)}
            rightSection={sortBy === option.value ? "✓" : ""}
          >
            {option.label}
          </MenuItem>
        ))}
      </MenuDropdown>
    </Menu>
  );
}
