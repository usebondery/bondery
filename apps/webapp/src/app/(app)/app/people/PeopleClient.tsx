"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { Paper } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconBrandLinkedin,
  IconBriefcase,
  IconClock,
  IconId,
  IconMapPin,
  IconShare,
  IconUser,
  IconUserCircle,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ContactsTable, {
  type ColumnConfig,
  type SortOrder,
} from "@/components/contacts/ContactsTableV2";
import { openDeleteContactModal } from "@/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/components/contacts/openDeleteContactsModal";
import { useBatchEnrichFromLinkedIn } from "@/components/extension/useBatchEnrichFromLinkedIn";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { downloadContactVcard } from "@/lib/api/domains/contacts";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { setClientCookie } from "@/lib/cookies/client";
import { COLUMN_VISIBILITY_COOKIE } from "@/lib/cookies/constants";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { parseContactsListParams } from "@/lib/query/contactsListParams";
import { useContactsInfiniteQuery } from "@/lib/query/hooks/useContacts";
import { openAddPeopleToGroupSelectionModal } from "./components/modals/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "./components/modals/MergeWithModal";
import { openShareContactModal } from "./components/modals/ShareContactModal";

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
    fixed: key === "name",
    key,
    label: labels[key] ?? key,
    visible: true,
  }));
  if (!saved) {
    return defaults;
  }
  const savedMap = new Map(saved.map((e) => [e.key, e.visible]));
  return defaults.map((col) => {
    const visible = savedMap.get(col.key);
    return visible === undefined ? col : { ...col, visible };
  });
}

/**
 * Writes column visibility to a cookie so it can be read server-side on the
 * next request, preventing a layout shift from client-only state rehydration.
 */
async function saveColumnsToCookie(columns: ColumnConfig[]): Promise<void> {
  try {
    const value = encodeURIComponent(
      JSON.stringify(columns.map(({ key, visible }) => ({ key, visible }))),
    );
    await setClientCookie(COLUMN_VISIBILITY_COOKIE, value);
  } catch {
    // Cookie writes can fail in restrictive environments — fail silently
  }
}

interface PeopleClientProps {
  /** Column visibility preferences resolved server-side from the cookie. */
  savedColumnVisibility?: { key: string; visible: boolean }[];
}

export function PeopleClient({ savedColumnVisibility }: PeopleClientProps) {
  const _queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useWebTranslations("PeoplePage");
  const tCommon = useCommonTranslations();
  const { columnDefinitions } = useContactsTableCopy();
  const tShare = useWebTranslations("ShareContactModal");
  const tEnrich = useWebTranslations("EnrichFromLinkedIn");
  const tActions = useWebTranslations("ContactActionMenu");
  const { startForPerson } = useBatchEnrichFromLinkedIn();
  const listFilter = parseContactsListParams({
    search: searchParams.get("search") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });
  const searchDefaultValue = listFilter.search ?? "";

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useContactsInfiniteQuery(listFilter);

  const contacts = data?.pages.flatMap((page) => page.contacts) ?? [];
  const totalAvailableCount = data?.pages[0]?.pagination.totalCount ?? 0;
  const hasMore = data?.pages.at(-1)?.pagination.hasMore ?? false;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllTotalSelected, setIsAllTotalSelected] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const columnLabels = useMemo(
    () => Object.fromEntries(DEFAULT_COLUMN_KEYS.map((key) => [key, columnDefinitions[key].label])),
    [columnDefinitions],
  );

  // Icons are stable references — defined inline so they can be merged with
  // server-resolved prefs (the cookie carries only key + visible, not JSX).
  const columnIcons: Record<string, React.ReactNode> = {
    headline: <IconBriefcase size={16} />,
    lastInteraction: <IconClock size={16} />,
    location: <IconMapPin size={16} />,
    name: <IconUser size={16} />,
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
      void saveColumnsToCookie(nextColumns);
      return nextColumns;
    });
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setIsAllTotalSelected(false);
    setExcludedIds(new Set());
    setLastSelectedIndex(null);
  }, []);

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
      disableLeftPicker: true,
      disableRightPicker: Boolean(lockBoth),
      leftPersonId,
      onSearch: searchContacts,
      rightPersonId,
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
      if (currentIndex >= 0) {
        setLastSelectedIndex(currentIndex);
      }
      return;
    }

    if (options?.shiftKey && lastSelectedIndex !== null && currentIndex >= 0) {
      const shouldSelect = !selectedIds.has(id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = contacts.slice(start, end + 1).map((contact) => contact.id);

      const newSelected = new Set(selectedIds);

      if (shouldSelect) {
        for (const rangeId of rangeIds) {
          newSelected.add(rangeId);
        }
      } else {
        for (const rangeId of rangeIds) {
          newSelected.delete(rangeId);
        }
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
          description: t("LoadMoreError"),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    }
  };

  const handleDeleteSelected = (ids: string[]) => {
    openDeleteContactsModal({
      contactIds: isAllTotalSelected ? [] : ids,
      filterPayload: isAllTotalSelected
        ? {
            excludeIds: Array.from(excludedIds),
            filter: { search: listFilter.search, sort: listFilter.sort },
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
    <Paper p="md" radius="md" ref={paperRef} shadow="sm" withBorder>
      <ContactsTable
        allSelected={allSelected}
        columnsForMenu={effectiveColumns}
        contacts={contacts}
        excludedIds={excludedIds}
        hasMore={hasMore}
        isAllTotalSelected={isAllTotalSelected}
        isHeaderShown={true}
        loadMoreAction={{
          label: t("LoadMoreBatch"),
          loading: isFetchingNextPage,
          onClick: handleLoadMore,
        }}
        menuActions={[
          {
            icon: <IconShare size={16} />,
            key: "share",
            label: tShare("ActionLabelMenu"),
            onClick: (contactId) => {
              const contact = contacts.find((c) => c.id === contactId);
              if (contact) {
                openShareContactModal({ contact });
              }
            },
          },
          {
            icon: <IconId size={16} />,
            key: "download-vcard",
            label: tActions("DownloadVCard"),
            onClick: async (contactId) => {
              try {
                const response = await downloadContactVcard(contactId);
                if (!response.ok) {
                  throw new Error("Failed to export vCard");
                }
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
                    description: tActions("ExportSuccessDescription"),
                    title: tActions("ExportSuccess"),
                  }),
                );
              } catch {
                notifications.show(
                  errorNotificationTemplate({
                    description: tActions("ExportErrorDescription"),
                    title: tActions("ExportError"),
                  }),
                );
              }
            },
          },
          {
            icon: <IconBrandLinkedin size={16} />,
            key: "enrich-linkedin",
            label: tEnrich("MenuLabel"),
            onClick: (contactId) => {
              const contact = contacts.find((c) => c.id === contactId);
              startForPerson(contactId, contact?.linkedin);
            },
          },
        ]}
        noContactsFound={t("NoContactsFound")}
        noContactsMatchSearch={t("NoContactsMatchSearch")}
        onSearchChange={handleSearch}
        onSelectAll={handleSelectAll}
        onSelectAllTotal={hasMore ? handleSelectAllTotal : undefined}
        onSelectOne={handleSelectOne}
        searchDefaultValue={searchDefaultValue}
        searchLoading={isSearchPending || (isFetching && !isFetchingNextPage)}
        searchPlaceholder={t("SearchPlaceholder")}
        selectedIds={selectedIds}
        setColumnsForMenu={handleColumnsMenuChange}
        setSortOrderForMenu={handleSort}
        showSelection={true}
        someSelected={someSelected}
        sortOrderForMenu={listFilter.sort}
        standardActions={{
          mergeDisabledTooltip: tActions("CannotMergeMyself"),
          onAddToGroupsOne: (contactId) => handleAddToGroup([contactId]),
          onAddToGroupsSelected: (contactIds) => handleAddToGroup(contactIds),
          onDeleteOne: handleDeleteContact,
          onDeleteSelected: handleDeleteSelected,
          onMergeOne: (contactId) => openMergeModal(contactId),
          onMergeSelected: (leftContactId, rightContactId) =>
            openMergeModal(leftContactId, rightContactId, true),
        }}
        totalCount={totalAvailableCount}
        visibleColumns={effectiveColumns}
      />
    </Paper>
  );
}
