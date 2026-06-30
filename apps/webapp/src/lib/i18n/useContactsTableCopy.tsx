"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  IconBriefcase,
  IconClock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import type { ColumnKey, SortOrder } from "@/app/(app)/app/components/contacts/ContactsTableV2";
import type { DataTableLabels, SortOption } from "@bondery/mantine-next";
import { useWebTranslations as useTranslations } from "./useWebTranslations";

export function useContactsTableCopy() {
  const t = useTranslations("ContactsTable");

  const columnDefinitions = useMemo<
    Record<ColumnKey, { label: string; icon: ReactNode }>
  >(
    () => ({
      name: { label: t("ColumnName"), icon: <IconUser size={16} /> },
      headline: { label: t("ColumnHeadline"), icon: <IconBriefcase size={16} /> },
      location: { label: t("ColumnLocation"), icon: <IconMapPin size={16} /> },
      lastInteraction: {
        label: t("ColumnLastInteraction"),
        icon: <IconClock size={16} />,
      },
      social: { label: t("ColumnSocials"), icon: <IconUserCircle size={16} /> },
      phone: { label: t("ColumnPhone"), icon: <IconPhone size={16} /> },
      email: { label: t("ColumnEmail"), icon: <IconMail size={16} /> },
      avatar: { label: "", icon: null },
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
    searchPlaceholder: overrides.searchPlaceholder ?? t("SearchPlaceholder"),
    emptyStateMessage: overrides.emptyStateMessage ?? "",
    loadMoreLabel: overrides.loadMoreLabel,
    selectedCountTemplate: t("SelectedCountTemplate"),
    selectedSingularCountTemplate: t("SelectedSingularCountTemplate"),
    totalCountTemplate: t("TotalCountTemplate"),
    actionsAriaLabel: t("ActionsAriaLabel"),
    columnVisibility: {
      buttonLabel: t("VisibleColumnsButton"),
      visibleSection: t("VisibleColumnsSection"),
      hiddenSection: t("HiddenColumnsSection"),
      noVisible: t("NoVisibleColumns"),
      noHidden: t("NoHiddenColumns"),
    },
    selectAllTotalTemplate: t("SelectAllTotalTemplate"),
    clearAllTotalTemplate: t("ClearAllTotalTemplate"),
    sort: {
      buttonLabel: t("SortButton"),
    },
    ...overrides,
  });

  return {
    t,
    columnDefinitions,
    sortOptions,
    buildTableLabels,
  };
}
