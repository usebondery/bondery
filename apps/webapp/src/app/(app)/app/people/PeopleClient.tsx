"use client";

import { Button, Stack, Group, Paper } from "@mantine/core";
import {
  IconAddressBook,
  IconBrandLinkedin,
  IconUserPlus,
  IconUsers,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconClock,
  IconUserCircle,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useDeferredValue, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "@mantine/hooks";
import ContactsTable, {
  ColumnConfig,
  type SortOrder,
} from "@/app/(app)/app/components/contacts/ContactsTableV2";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { openAddContactModal } from "./components/AddContactModal";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import { formatContactName } from "@/lib/nameHelpers";
import { openDeleteContactModal } from "@/app/(app)/app/components/contacts/openDeleteContactModal";
import { openDeleteContactsModal } from "@/app/(app)/app/components/contacts/openDeleteContactsModal";
import { openAddPeopleToGroupSelectionModal } from "./components/AddPeopleToGroupSelectionModal";
import { MERGE_CONFLICT_FIELDS, openMergeWithModal } from "./components/MergeWithModal";
import { WEBSITE_URL } from "@/lib/config";
import { useEnrichFromLinkedIn } from "@/lib/extension/useEnrichFromLinkedIn";

import type { Contact, MergeConflictField } from "@bondery/types";
import { revalidateContacts } from "../actions";

interface PeopleClientProps {
  initialContacts: Contact[];
  totalCount: number;
  layout?: "stack" | "container";
}

export function PeopleClient({ initialContacts, totalCount, layout = "stack" }: PeopleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("PeoplePage");
  const tHeader = useTranslations("PageHeader");
  const tMerge = useTranslations("MergeWithModal");
  const tEnrich = useTranslations("EnrichFromLinkedIn");
  const { enrichFromLinkedIn } = useEnrichFromLinkedIn({ onSuccess: revalidateContacts });
  const mergeTexts = useMemo(
    () => ({
      errorTitle: tMerge("ErrorTitle"),
      successTitle: tMerge("SuccessTitle"),
      selectBothPeopleError: tMerge("SelectBothPeopleError"),
      differentPeopleError: tMerge("DifferentPeopleError"),
      mergingTitle: tMerge("MergingTitle"),
      mergingDescription: tMerge("MergingDescription"),
      mergeSuccess: tMerge("MergeSuccess"),
      mergeFailed: tMerge("MergeFailed"),
      mergeWithLabel: tMerge("MergeWithLabel"),
      selectLeftPerson: tMerge("SelectLeftPerson"),
      selectRightPerson: tMerge("SelectRightPerson"),
      searchPeople: tMerge("SearchPeople"),
      noPeopleFound: tMerge("NoPeopleFound"),
      cancel: tMerge("Cancel"),
      continue: tMerge("Continue"),
      back: tMerge("Back"),
      merge: tMerge("Merge"),
      noConflicts: tMerge("NoConflicts"),
      conflictHint: tMerge("ConflictHint"),
      processing: tMerge("Processing"),
      steps: {
        pick: tMerge("Steps.Pick"),
        resolve: tMerge("Steps.Resolve"),
        process: tMerge("Steps.Process"),
      },
      fields: Object.fromEntries(
        MERGE_CONFLICT_FIELDS.map((field) => [field, tMerge(`Fields.${field}`)]),
      ) as Record<MergeConflictField, string>,
    }),
    [tMerge],
  );

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
  const [columns, setColumns] = useState<ColumnConfig[]>([
    {
      key: "name",
      label: "Name",
      visible: true,
      icon: <IconUser size={16} />,
      fixed: true,
    },
    {
      key: "headline",
      label: "Headline",
      visible: true,
      icon: <IconBriefcase size={16} />,
    },
    {
      key: "place",
      label: "Location",
      visible: true,
      icon: <IconMapPin size={16} />,
    },
    {
      key: "lastInteraction",
      label: "Last Interaction",
      visible: true,
      icon: <IconClock size={16} />,
    },
    {
      key: "social",
      label: "Social Media",
      visible: true,
      icon: <IconUserCircle size={16} />,
    },
  ]);

  // Defer the columns update to prevent UI freezing when toggling visibility
  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

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
  const handleSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 500);

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
      titleText: tMerge("ModalTitle"),
      texts: mergeTexts,
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

  const WrapperComponent = layout === "container" ? Group : Stack;

  return (
    <PageWrapper>
      <WrapperComponent gap="xl" {...(layout === "container" ? { justify: "space-between" } : {})}>
        <PageHeader
          icon={IconUsers}
          title={t("Title")}
          description={t("HeaderDescription")}
          helpHref={`${WEBSITE_URL}/docs/core-concepts/people`}
          helpLabel={tHeader("LearnMoreAbout", { concept: tHeader("Concepts.People") })}
          secondaryAction={
            <Button
              variant="outline"
              size="md"
              leftSection={<IconAddressBook size={16} />}
              onClick={() => router.push(`${WEBAPP_ROUTES.SETTINGS}#data-management`)}
            >
              {t("ImportContacts")}
            </Button>
          }
          primaryAction={
            <Button
              size="md"
              leftSection={<IconUserPlus size={16} />}
              onClick={openAddContactModal}
            >
              {t("AddPerson")}
            </Button>
          }
        />

        <Paper withBorder shadow="sm" radius="md" p="md">
          <ContactsTable
            contacts={contacts}
            selectedIds={selectedIds}
            isHeaderShown={true}
            searchDefaultValue={initialSearch}
            onSearchChange={handleSearch}
            noContactsFound={t("NoContactsFound")}
            noContactsMatchSearch={t("NoContactsMatchSearch")}
            columnsForMenu={columns}
            setColumnsForMenu={setColumns}
            sortOrderForMenu={initialSort}
            setSortOrderForMenu={handleSort}
            visibleColumns={visibleColumns}
            onSelectAll={handleSelectAll}
            onSelectOne={handleSelectOne}
            allSelected={allSelected}
            someSelected={someSelected}
            showSelection={true}
            standardActions={{
              onMergeOne: (contactId) => openMergeModal(contactId),
              onMergeSelected: (leftContactId, rightContactId) =>
                openMergeModal(leftContactId, rightContactId, true),
              onAddToGroupsOne: (contactId) => handleAddToGroup([contactId]),
              onAddToGroupsSelected: (contactIds) => handleAddToGroup(contactIds),
              onDeleteOne: handleDeleteContact,
              onDeleteSelected: handleDeleteSelected,
            }}
            menuActions={[
              {
                key: "enrich-linkedin",
                label: tEnrich("MenuLabel"),
                icon: <IconBrandLinkedin size={16} />,
                onClick: (contactId) => {
                  const contact = contacts.find((c) => c.id === contactId);
                  enrichFromLinkedIn(contactId, contact?.linkedin);
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
            onSelectAllTotal={
              contacts.length < totalAvailableCount ? handleSelectAllTotal : undefined
            }
            isAllTotalSelected={isAllTotalSelected}
            excludedIds={excludedIds}
          />
        </Paper>
      </WrapperComponent>
    </PageWrapper>
  );
}
