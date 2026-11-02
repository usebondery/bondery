"use client";

import { SortMenu as SharedSortMenu } from "@bondery/mantine-next";
import { useGroupsPageTranslations } from "@/lib/i18n/generated/hooks";

export type SortOption = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";

const DEFAULT_GROUPS_SORT: SortOption = "count-desc";

interface SortMenuProps {
  setSortBy: (option: SortOption) => void;
  sortBy: SortOption;
}

/**
 * Groups page sort menu. Renders the shared `SortMenu` from `@bondery/mantine-next`
 * so the option rows match every other menu in the product.
 */
export function SortMenu({ sortBy, setSortBy }: SortMenuProps) {
  const t = useGroupsPageTranslations("SortMenu");

  const sortOptions = [
    { key: "count-desc" as const, label: t("CountDesc") },
    { key: "count-asc" as const, label: t("CountAsc") },
    { key: "alpha-asc" as const, label: t("AlphaAsc") },
    { key: "alpha-desc" as const, label: t("AlphaDesc") },
  ];

  return (
    <SharedSortMenu
      currentSort={sortBy}
      isActive={sortBy !== DEFAULT_GROUPS_SORT}
      labels={{ buttonLabel: t("Label") }}
      onSortChange={setSortBy}
      sortOptions={sortOptions}
      width={180}
    />
  );
}
