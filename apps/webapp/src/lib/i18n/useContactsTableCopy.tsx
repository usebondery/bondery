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
import type { SortOrder } from "@/lib/contacts/table-types";
import { useContactsTableTranslations } from "@/lib/i18n/generated/hooks";

export function useContactsTableCopy() {
  const t = useContactsTableTranslations();

  const columnDefinitions = {
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
  };

  const sortOptions: SortOption<SortOrder>[] = [
    { key: "nameAsc", label: t("SortNameAsc") },
    { key: "nameDesc", label: t("SortNameDesc") },
    { key: "surnameAsc", label: t("SortSurnameAsc") },
    { key: "surnameDesc", label: t("SortSurnameDesc") },
    { key: "interactionDesc", label: t("SortInteractionDesc") },
    { key: "interactionAsc", label: t("SortInteractionAsc") },
    { key: "createdAtDesc", label: t("SortCreatedDesc") },
    { key: "createdAtAsc", label: t("SortCreatedAsc") },
  ];

  const buildTableLabels = (
    overrides: Partial<DataTableLabels> & {
      searchPlaceholder?: string;
      emptyStateMessage?: string;
      loadMoreLabel?: string;
    },
  ): DataTableLabels => {
    const { emptyStateMessage, loadMoreLabel, searchPlaceholder, ...rest } = overrides;
    return {
      actionsAriaLabel: t("ActionsAriaLabel"),
      clearAllTotalTemplate: t("ClearAllTotalTemplate"),
      columnVisibility: {
        buttonLabel: t("VisibleColumnsButton"),
        hiddenSection: t("HiddenColumnsSection"),
        noHidden: t("NoHiddenColumns"),
        noVisible: t("NoVisibleColumns"),
        visibleSection: t("VisibleColumnsSection"),
      },
      emptyStateMessage: emptyStateMessage ?? "",
      loadMoreLabel,
      searchPlaceholder: searchPlaceholder ?? t("SearchPlaceholder"),
      selectAllTotalTemplate: t("SelectAllTotalTemplate"),
      selectedCountTemplate: t("SelectedCountTemplate"),
      selectedSingularCountTemplate: t("SelectedSingularCountTemplate"),
      sort: {
        buttonLabel: t("SortButton"),
      },
      totalCountTemplate: t("TotalCountTemplate"),
      ...rest,
    };
  };

  return {
    buildTableLabels,
    columnDefinitions,
    sortOptions,
    t,
  };
}
