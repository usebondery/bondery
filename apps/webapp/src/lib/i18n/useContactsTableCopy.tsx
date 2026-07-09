"use client";

import type { DataTableLabels, SortOption } from "@bondery/mantine-next";
import {
  IconBriefcase,
  IconClock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { ColumnKey, SortOrder } from "@/lib/contacts/table-types";
import { useWebTranslations } from "./useWebTranslations";

export function useContactsTableCopy() {
  const t = useWebTranslations("ContactsTable");

  const columnDefinitions = useMemo<Record<ColumnKey, { label: string; icon: ReactNode }>>(
    () => ({
      avatar: { icon: null, label: "" },
      email: { icon: <IconMail size={16} />, label: t("ColumnEmail") },
      headline: { icon: <IconBriefcase size={16} />, label: t("ColumnHeadline") },
      lastInteraction: {
        icon: <IconClock size={16} />,
        label: t("ColumnLastInteraction"),
      },
      location: { icon: <IconMapPin size={16} />, label: t("ColumnLocation") },
      name: { icon: <IconUser size={16} />, label: t("ColumnName") },
      phone: { icon: <IconPhone size={16} />, label: t("ColumnPhone") },
      social: { icon: <IconUserCircle size={16} />, label: t("ColumnSocials") },
    }),
    [t],
  );

  const sortOptions = useMemo<SortOption<SortOrder>[]>(
    () => [
      { key: "nameAsc", label: t("SortNameAsc") },
      { key: "nameDesc", label: t("SortNameDesc") },
      { key: "surnameAsc", label: t("SortSurnameAsc") },
      { key: "surnameDesc", label: t("SortSurnameDesc") },
      { key: "interactionDesc", label: t("SortInteractionDesc") },
      { key: "interactionAsc", label: t("SortInteractionAsc") },
      { key: "createdAtDesc", label: t("SortCreatedDesc") },
      { key: "createdAtAsc", label: t("SortCreatedAsc") },
    ],
    [t],
  );

  const buildTableLabels = (
    overrides: Partial<DataTableLabels> & {
      searchPlaceholder?: string;
      emptyStateMessage?: string;
      loadMoreLabel?: string;
    },
  ): DataTableLabels => ({
    actionsAriaLabel: t("ActionsAriaLabel"),
    clearAllTotalTemplate: t("ClearAllTotalTemplate"),
    columnVisibility: {
      buttonLabel: t("VisibleColumnsButton"),
      hiddenSection: t("HiddenColumnsSection"),
      noHidden: t("NoHiddenColumns"),
      noVisible: t("NoVisibleColumns"),
      visibleSection: t("VisibleColumnsSection"),
    },
    emptyStateMessage: overrides.emptyStateMessage ?? "",
    loadMoreLabel: overrides.loadMoreLabel,
    searchPlaceholder: overrides.searchPlaceholder ?? t("SearchPlaceholder"),
    selectAllTotalTemplate: t("SelectAllTotalTemplate"),
    selectedCountTemplate: t("SelectedCountTemplate"),
    selectedSingularCountTemplate: t("SelectedSingularCountTemplate"),
    sort: {
      buttonLabel: t("SortButton"),
    },
    totalCountTemplate: t("TotalCountTemplate"),
    ...overrides,
  });

  return {
    buildTableLabels,
    columnDefinitions,
    sortOptions,
    t,
  };
}
