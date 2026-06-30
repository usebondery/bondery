"use client";

import { Paper } from "@mantine/core";
import {
  IconBrandLinkedin,
  IconId,
  IconShare,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconClock,
  IconUserCircle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useRef, useTransition, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDebouncedCallback } from "@mantine/hooks";
import { DEBOUNCE_MS } from "@/lib/config";
import ContactsTable, {
  ColumnConfig,
  type SortOrder,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { downloadContactVcard } from "@/lib/api/domains/contacts";
import { openAddContactModal } from "./components/AddContactModal";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { formatContactName } from "@/lib/nameHelpers";
import { useOpenDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { useOpenDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { openAddPeopleToGroupSelectionModal } from "./components/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "./components/MergeWithModal";
import { openShareContactModal } from "./components/ShareContactModal";
import { useBatchEnrichFromLinkedIn } from "@/lib/extension/useBatchEnrichFromLinkedIn";

import type { Contact } from "@bondery/schemas";
import { useContactsInfiniteQuery } from "@/lib/query/hooks/useContacts";
import { parseContactsListParams } from "@/lib/query/fetchers/contactsListParams";
import { useQueryClient } from "@tanstack/react-query";
import { searchContacts } from "@/lib/searchContacts";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";

const COLUMN_VISIBILITY_COOKIE = "bondery_contacts_columns";

const DEFAULT_COLUMN_KEYS = ["name", "headline", "location", "lastInteraction", "social"] as const;

/**
 * Merges saved visibility preferences into the default column list.
 * Columns not present in saved data use their code defaults, so new columns
 * added in a future deploy always appear correctly.
 */
function applyColumnVisibility(
  saved: { key: string; visible: boolean }[] | undefined,
  labels: Record<string, string>,
): Omit<ColumnConfig, "icon">[] {
  const defaults: Omit<ColumnConfig, "icon">[] = DEFAULT_COLUMN_KEYS.map((key) => ({
    key,
    label: labels[key] ?? key,
    visible: true,
    fixed: key === "name",
  }));
  if (!saved) return defaults;
  const savedMap = new Map(saved.map((e) => [e.key, e.visible]));
  return defaults.map((col) =>
    savedMap.has(col.key) ? { ...col, visible: savedMap.get(col.key)! } : col,
  );
}

/**
 * Writes column visibility to a cookie so it can be read server-side on the
 * next request, preventing a layout shift from client-only state rehydration.
 */
function saveColumnsToCookie(columns: ColumnConfig[]): void {
  try {
    const value = encodeURIComponent(
      JSON.stringify(columns.map(({ key, visible }) => ({ key, visible }))),
    );
    document.cookie = `${COLUMN_VISIBILITY_COOKIE}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Cookie writes can fail in restrictive environments — fail silently
  }
}

interface PeopleClientProps {
  /** Column visibility preferences resolved server-side from the cookie. */
  savedColumnVisibility?: { key: string; visible: boolean }[];
}

export function PeopleClient({ savedColumnVisibility }: PeopleClientProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("PeoplePage");
  const tCommon = useTranslations("WebAppCommon");
  const { columnDefinitions } = useContactsTableCopy();
  const openDeleteContactModal = useOpenDeleteContactModal();
  const openDeleteContactsModal = useOpenDeleteContactsModal();
  const tShare = useTranslations("ShareContactModal");
  const tEnrich = useTranslations("EnrichFromLinkedIn");
  const tActions = useTranslations("ContactActionMenu");
  const { startForPerson } = useBatchEnrichFromLinkedIn();
  const listFilter = parseContactsListParams({
    search: searchParams.get("search") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });
  const searchDefaultValue = listFilter.search ?? "";

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
    refetch,
  } = useContactsInfiniteQuery(listFilter);

  const contacts = data?.pages.flatMap((page) => page.contacts) ?? [];
  const totalAvailableCount = data?.pages[0]?.pagination.totalCount ?? 0;
  const hasMore = data?.pages.at(-1)?.pagination.hasMore ?? false;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllTotalSelected, setIsAllTotalSelected] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const columnLabels = useMemo(
    () =>
      Object.fromEntries(
        DEFAULT_COLUMN_KEYS.map((key) => [key, columnDefinitions[key].label]),
      ),
    [columnDefinitions],
  );

  // Icons are stable references — defined inline so they can be merged with
  // server-resolved prefs (the cookie carries only key + visible, not JSX).
  const columnIcons: Record<string, React.ReactNode> = {
    name: <IconUser size={16} />,
    headline: <IconBriefcase size={16} />,
    location: <IconMapPin size={16} />,
    lastInteraction: <IconClock size={16} />,
    social: <IconUserCircle size={16} />,
  };

  // Initial state is derived from the server-resolved cookie prop so the server
  // HTML already has the correct columns — no mount-time localStorage read,
  // no layout shift.
  const [columns, setColumns] = useState<ColumnConfig[]>(() =>
    applyColumnVisibility(savedColumnVisibility, columnLabels).map((col) => ({
      ...col,
      icon: columnIcons[col.key],
    })),
  );

  useEffect(() => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        label: columnLabels[col.key] ?? col.label,
      })),
    );
  }, [columnLabels]);

  // Defer the columns update to prevent UI freezing when toggling visibility
  const { effectiveColumns, onColumnsChange } = useResponsiveColumns(paperRef, columns);

  // Wrapper passed to ContactsTable so both user-state and pinned-keys stay in sync
  const handleColumnsMenuChange: React.Dispatch<React.SetStateAction<ColumnConfig[]>> = (
    action,
  ) => {
    setColumns((prev) => {
      const nextColumns = typeof action === "function" ? action(prev) : action;
      onColumnsChange(nextColumns);
      // Write to cookie so the server can render the correct columns on the next
      // request, eliminating layout shift from client-only rehydration.
      saveColumnsToCookie(nextColumns);
      return nextColumns;
    });
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setIsAllTotalSelected(false);
    setExcludedIds(new Set());
    setLastSelectedIndex(null);
  }, [listFilter.search, listFilter.sort]);

  // Handle search: debounce the URL update so the server is only re-fetched
  // after the user pauses, while DataTable keeps the input responsive locally.
  const [isSearchPending, startSearchTransition] = useTransition();
  const handleSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }
    startSearchTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, DEBOUNCE_MS.search);
  const handleSort = (order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDeleteContact = (contactId: string) => {
    const targetContact = contacts.find((contact) => contact.id === contactId);

    const contactName = targetContact ? formatContactName(targetContact) : t("ThisContactFallback");

    openDeleteContactModal({
      contactId,
      contactName,
      onDeleted: async () => {
        setSelectedIds(new Set());
      },
    });
  };

  const handleAddToGroup = (personIds: string[]) => {
    if (personIds.length === 0) {
      return;
    }

    openAddPeopleToGroupSelectionModal({ personIds });
  };

  const openMergeModal = (leftPersonId: string, rightPersonId?: string, lockBoth?: boolean) => {
    openMergeWithModal({
      contacts,
      leftPersonId,
      rightPersonId,
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      onSearch: searchContacts,
    });
  };

  const handleSelectAll = () => {
    if (isAllTotalSelected) {
      setIsAllTotalSelected(false);
      setExcludedIds(new Set());
      setSelectedIds(new Set());
      return;
    }
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? contacts.findIndex((contact) => contact.id === id);

    if (isAllTotalSelected) {
      const newExcluded = new Set(excludedIds);
      if (newExcluded.has(id)) {
        newExcluded.delete(id);
      } else {
        newExcluded.add(id);
      }
      if (newExcluded.size >= totalAvailableCount) {
        setIsAllTotalSelected(false);
        setExcludedIds(new Set());
        setSelectedIds(new Set());
      } else {
        setExcludedIds(newExcluded);
      }
      if (currentIndex >= 0) setLastSelectedIndex(currentIndex);
      return;
    }

    if (options?.shiftKey && lastSelectedIndex !== null && currentIndex >= 0) {
      const shouldSelect = !selectedIds.has(id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = contacts.slice(start, end + 1).map((contact) => contact.id);

      const newSelected = new Set(selectedIds);

      if (shouldSelect) {
        rangeIds.forEach((rangeId) => newSelected.add(rangeId));
      } else {
        rangeIds.forEach((rangeId) => newSelected.delete(rangeId));
      }

      setSelectedIds(newSelected);
      setLastSelectedIndex(currentIndex);
      return;
    }

    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);

    if (currentIndex >= 0) {
      setLastSelectedIndex(currentIndex);
    }
  };

  const handleLoadMore = async () => {
    if (isFetchingNextPage || !hasNextPage) {
      return;
    }
    try {
      await fetchNextPage();
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: tCommon("ErrorTitle"),
          description: t("LoadMoreError"),
        }),
      );
    }
  };

  const handleDeleteSelected = (ids: string[]) => {
    openDeleteContactsModal({
      contactIds: isAllTotalSelected ? [] : ids,
      filterPayload: isAllTotalSelected
        ? {
            filter: { search: listFilter.search, sort: listFilter.sort },
            excludeIds: Array.from(excludedIds),
          }
        : undefined,
      onDeleted: async () => {
        setIsAllTotalSelected(false);
        setExcludedIds(new Set());
        setSelectedIds(new Set());
      },
    });
  };

  /** Instant: flip the sentinel flag — no network call. */
  const handleSelectAllTotal = () => {
    setIsAllTotalSelected(true);
    setExcludedIds(new Set());
    // Keep selectedIds as-is; DataTable will use allTotalSelected for rendering.
  };

  const allSelected = isAllTotalSelected
    ? contacts.length > 0 && contacts.every((c) => !excludedIds.has(c.id))
    : contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const someSelected = isAllTotalSelected
    ? !allSelected && excludedIds.size < totalAvailableCount
    : !allSelected && selectedIds.size > 0;

  return (
    <Paper ref={paperRef} withBorder shadow="sm" radius="md" p="md">
      <ContactsTable
        contacts={contacts}
        selectedIds={selectedIds}
        isHeaderShown={true}
        searchDefaultValue={searchDefaultValue}
        onSearchChange={handleSearch}
        searchLoading={isSearchPending || (isFetching && !isFetchingNextPage)}
        searchPlaceholder={t("SearchPlaceholder")}
        noContactsFound={t("NoContactsFound")}
        noContactsMatchSearch={t("NoContactsMatchSearch")}
        columnsForMenu={effectiveColumns}
        setColumnsForMenu={handleColumnsMenuChange}
        sortOrderForMenu={listFilter.sort}
        setSortOrderForMenu={handleSort}
        visibleColumns={effectiveColumns}
        onSelectAll={handleSelectAll}
        onSelectOne={handleSelectOne}
        allSelected={allSelected}
        someSelected={someSelected}
        showSelection={true}
        standardActions={{
          onMergeOne: (contactId) => openMergeModal(contactId),
          onMergeSelected: (leftContactId, rightContactId) =>
            openMergeModal(leftContactId, rightContactId, true),
          mergeDisabledTooltip: tActions("CannotMergeMyself"),
          onAddToGroupsOne: (contactId) => handleAddToGroup([contactId]),
          onAddToGroupsSelected: (contactIds) => handleAddToGroup(contactIds),
          onDeleteOne: handleDeleteContact,
          onDeleteSelected: handleDeleteSelected,
        }}
        menuActions={[
          {
            key: "share",
            label: tShare("ActionLabelMenu"),
            icon: <IconShare size={16} />,
            onClick: (contactId) => {
              const contact = contacts.find((c) => c.id === contactId);
              if (contact) {
                openShareContactModal({ contact });
              }
            },
          },
          {
            key: "download-vcard",
            label: tActions("DownloadVCard"),
            icon: <IconId size={16} />,
            onClick: async (contactId) => {
              try {
                const response = await downloadContactVcard(contactId);
                if (!response.ok) throw new Error("Failed to export vCard");
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const contact = contacts.find((c) => c.id === contactId);
                const firstName = contact?.firstName || "contact";
                const lastName = contact?.lastName || "";
                a.download = lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                notifications.show(
                  successNotificationTemplate({
                    title: tActions("ExportSuccess"),
                    description: tActions("ExportSuccessDescription"),
                  }),
                );
              } catch {
                notifications.show(
                  errorNotificationTemplate({
                    title: tActions("ExportError"),
                    description: tActions("ExportErrorDescription"),
                  }),
                );
              }
            },
          },
          {
            key: "enrich-linkedin",
            label: tEnrich("MenuLabel"),
            icon: <IconBrandLinkedin size={16} />,
            onClick: (contactId) => {
              const contact = contacts.find((c) => c.id === contactId);
              startForPerson(contactId, contact?.linkedin);
            },
          },
        ]}
        loadMoreAction={{
          label: t("LoadMoreBatch"),
          onClick: handleLoadMore,
          loading: isFetchingNextPage,
        }}
        hasMore={hasMore}
        totalCount={totalAvailableCount}
        onSelectAllTotal={hasMore ? handleSelectAllTotal : undefined}
        isAllTotalSelected={isAllTotalSelected}
        excludedIds={excludedIds}
      />
    </Paper>
  );
}
