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
import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "@mantine/hooks";
import { DEBOUNCE_MS } from "@/lib/config";
import ContactsTable, {
  ColumnConfig,
  type SortOrder,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { openAddContactModal } from "./components/AddContactModal";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";
import { formatContactName } from "@/lib/nameHelpers";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { openAddPeopleToGroupSelectionModal } from "./components/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "./components/MergeWithModal";
import { openShareContactModal } from "./components/ShareContactModal";
import { useBatchEnrichFromLinkedIn } from "@/lib/extension/useBatchEnrichFromLinkedIn";

import type { Contact } from "@bondery/schemas";
import { revalidateContacts } from "../actions";
import { appendAvatarParams } from "@/lib/avatarParams";
import { searchContacts } from "@/lib/searchContacts";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";

const COLUMN_VISIBILITY_COOKIE = "bondery_contacts_columns";

/** Default column definitions. Icons are stable JSX — defined once outside the component. */
const DEFAULT_COLUMNS: Omit<ColumnConfig, "icon">[] = [
  { key: "name", label: "Name", visible: true, fixed: true },
  { key: "headline", label: "Headline", visible: true },
  { key: "location", label: "Location", visible: true },
  { key: "lastInteraction", label: "Last Interaction", visible: true },
  { key: "social", label: "Socials", visible: true },
];

/**
 * Merges saved visibility preferences into the default column list.
 * Columns not present in saved data use their code defaults, so new columns
 * added in a future deploy always appear correctly.
 */
function applyColumnVisibility(
  saved: { key: string; visible: boolean }[] | undefined,
): Omit<ColumnConfig, "icon">[] {
  if (!saved) return DEFAULT_COLUMNS;
  const savedMap = new Map(saved.map((e) => [e.key, e.visible]));
  return DEFAULT_COLUMNS.map((col) =>
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
  initialContacts: Contact[];
  totalCount: number;
  /** Column visibility preferences resolved server-side from the cookie. */
  savedColumnVisibility?: { key: string; visible: boolean }[];
}

export function PeopleClient({
  initialContacts,
  totalCount,
  savedColumnVisibility,
}: PeopleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("PeoplePage");
  const tShare = useTranslations("ShareContactModal");
  const tEnrich = useTranslations("EnrichFromLinkedIn");
  const tActions = useTranslations("ContactActionMenu");
  const { startForPerson } = useBatchEnrichFromLinkedIn();
  // Get initial state from URL params
  const initialSearch = searchParams.get("q") || "";
  const initialSort = (searchParams.get("sort") as SortOrder) || "nameAsc";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllTotalSelected, setIsAllTotalSelected] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [loadedCount, setLoadedCount] = useState(initialContacts.length);
  const [totalAvailableCount, setTotalAvailableCount] = useState(totalCount);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

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
    applyColumnVisibility(savedColumnVisibility).map((col) => ({
      ...col,
      icon: columnIcons[col.key],
    })),
  );

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
    setContacts(initialContacts);
    setLoadedCount(initialContacts.length);
    setTotalAvailableCount(totalCount);
    setSelectedIds(new Set());
    setIsAllTotalSelected(false);
    setExcludedIds(new Set());
    setLastSelectedIndex(null);
  }, [initialContacts, totalCount]);

  // Handle search: debounce the URL update so the server is only re-fetched
  // after the user pauses, while DataTable keeps the input responsive locally.
  const [isSearchPending, startSearchTransition] = useTransition();
  const handleSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    startSearchTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }, DEBOUNCE_MS.search);

  // Handle sort
  const handleSort = (order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleDeleteContact = (contactId: string) => {
    const targetContact = contacts.find((contact) => contact.id === contactId);

    const contactName = targetContact ? formatContactName(targetContact) : "this contact";

    openDeleteContactModal({
      contactId,
      contactName,
      onDeleted: async () => {
        setSelectedIds(new Set());
        const remaining = contacts.filter((contact) => contact.id !== contactId);
        const newTotal = Math.max(0, totalAvailableCount - 1);
        const refilled = await refillToPageSize(remaining, newTotal);
        setContacts(refilled);
        setLoadedCount(refilled.length);
        setTotalAvailableCount(newTotal);
        await revalidateContacts();
        router.refresh();
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
      // In filter-mode: clear everything
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

  /**
   * After deleting contacts, if the loaded list drops below PAGE_SIZE and more
   * contacts remain in the system, automatically fetch enough to fill back up.
   */
  const refillToPageSize = async (remaining: Contact[], newTotal: number): Promise<Contact[]> => {
    const PAGE_SIZE = 50;
    const needed = Math.min(PAGE_SIZE - remaining.length, newTotal - remaining.length);
    if (needed <= 0) return remaining;

    try {
      const params = new URLSearchParams();
      params.set("limit", String(needed));
      params.set("offset", String(remaining.length));
      if (initialSearch) params.set("q", initialSearch);
      if (initialSort) params.set("sort", initialSort);
      appendAvatarParams(params, "small");

      const res = await fetch(`${API_ROUTES.CONTACTS}?${params.toString()}`);
      if (!res.ok) return remaining;

      const data = await res.json();
      const extra = (data.contacts || []) as Contact[];
      const existingIds = new Set(remaining.map((c) => c.id));
      const uniqueExtra = extra.filter((c) => !existingIds.has(c.id));
      return [...remaining, ...uniqueExtra];
    } catch {
      return remaining;
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? contacts.findIndex((contact) => contact.id === id);

    // In filter-mode, toggle via excludedIds instead of selectedIds.
    if (isAllTotalSelected) {
      const newExcluded = new Set(excludedIds);
      if (newExcluded.has(id)) {
        newExcluded.delete(id);
      } else {
        newExcluded.add(id);
      }
      // If every single item was excluded, auto-clear filter mode.
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
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("offset", String(loadedCount));

      if (initialSearch) {
        params.set("q", initialSearch);
      }

      if (initialSort) {
        params.set("sort", initialSort);
      }

      appendAvatarParams(params, "small");

      const response = await fetch(`${API_ROUTES.CONTACTS}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to load more contacts");
      }

      const data = await response.json();
      const fetchedContacts = (data.contacts || []) as Contact[];

      setContacts((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const uniqueNew = fetchedContacts.filter((c) => !existingIds.has(c.id));
        return [...prev, ...uniqueNew];
      });
      setLoadedCount((prev) => prev + fetchedContacts.length);
      if (Number.isFinite(data.totalCount)) {
        setTotalAvailableCount(data.totalCount);
      }
    } catch {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to load more contacts. Please try again.",
        }),
      );
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDeleteSelected = (ids: string[]) => {
    openDeleteContactsModal({
      contactIds: isAllTotalSelected ? [] : ids,
      filterPayload: isAllTotalSelected
        ? {
            filter: { q: initialSearch || undefined, sort: initialSort || undefined },
            excludeIds: Array.from(excludedIds),
          }
        : undefined,
      onDeleted: async (deletedCount?: number) => {
        const removedCount = deletedCount ?? ids.length;
        setIsAllTotalSelected(false);
        setExcludedIds(new Set());
        setSelectedIds(new Set());
        const remaining = isAllTotalSelected
          ? contacts.filter((c) => excludedIds.has(c.id))
          : contacts.filter((contact) => !ids.includes(contact.id));
        const newTotal = Math.max(0, totalAvailableCount - removedCount);
        const refilled = await refillToPageSize(remaining, newTotal);
        setContacts(refilled);
        setLoadedCount(refilled.length);
        setTotalAvailableCount(newTotal);
        await revalidateContacts();
        router.refresh();
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
        searchDefaultValue={initialSearch}
        onSearchChange={handleSearch}
        searchLoading={isSearchPending}
        noContactsFound={t("NoContactsFound")}
        noContactsMatchSearch={t("NoContactsMatchSearch")}
        columnsForMenu={effectiveColumns}
        setColumnsForMenu={handleColumnsMenuChange}
        sortOrderForMenu={initialSort}
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
                const response = await fetch(`${API_ROUTES.CONTACTS}/${contactId}/vcard`);
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
          label: "Load another 50 contacts",
          onClick: handleLoadMore,
          loading: isLoadingMore,
        }}
        hasMoreToLoad={contacts.length < totalAvailableCount}
        totalCount={totalAvailableCount}
        onSelectAllTotal={contacts.length < totalAvailableCount ? handleSelectAllTotal : undefined}
        isAllTotalSelected={isAllTotalSelected}
        excludedIds={excludedIds}
      />
    </Paper>
  );
}
