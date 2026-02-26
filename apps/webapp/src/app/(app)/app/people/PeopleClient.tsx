"use client";

import { Button, Stack, Group, Paper } from "@mantine/core";
import {
  IconAddressBook,
  IconUserPlus,
  IconUsers,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconClock,
  IconBrandLinkedin,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEffect, useState, useDeferredValue, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import ContactsTable, { ColumnConfig } from "@/app/(app)/app/components/ContactsTable";
import { type SortOrder } from "@/app/(app)/app/components/contacts/SortMenu";
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
  const tMerge = useTranslations("MergeWithModal");
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
      key: "title",
      label: "Title",
      visible: true,
      icon: <IconBriefcase size={16} />,
    },
    {
      key: "place",
      label: "Place",
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
      icon: <IconBrandLinkedin size={16} />,
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
    setLastSelectedIndex(null);
  }, [initialContacts, totalCount]);

  // Handle search with debounce
  const handleSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

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
        setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
        setLoadedCount((prev) => Math.max(0, prev - 1));
        setTotalAvailableCount((prev) => Math.max(0, prev - 1));
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
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string, options?: { shiftKey?: boolean; index?: number }) => {
    const currentIndex = options?.index ?? contacts.findIndex((contact) => contact.id === id);

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

      setContacts((prev) => [...prev, ...fetchedContacts]);
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
      contactIds: ids,
      onDeleted: async () => {
        setSelectedIds(new Set());
        setContacts((prev) => prev.filter((contact) => !ids.includes(contact.id)));
        setLoadedCount((prev) => Math.max(0, prev - ids.length));
        setTotalAvailableCount((prev) => Math.max(0, prev - ids.length));
        await revalidateContacts();
        router.refresh();
      },
    });
  };

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < contacts.length;

  const WrapperComponent = layout === "container" ? Group : Stack;

  return (
    <PageWrapper>
      <WrapperComponent gap="xl" {...(layout === "container" ? { justify: "space-between" } : {})}>
        <PageHeader
          icon={IconUsers}
          title="People"
          secondaryAction={
            <Button
              variant="outline"
              size="md"
              leftSection={<IconAddressBook size={16} />}
              onClick={() => router.push(`${WEBAPP_ROUTES.SETTINGS}#data-management`)}
            >
              Import contacts
            </Button>
          }
          primaryAction={
            <Button
              size="md"
              leftSection={<IconUserPlus size={16} />}
              onClick={openAddContactModal}
            >
              Add new person
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
            loadMoreAction={{
              label: "Load another 50 contacts",
              onClick: handleLoadMore,
              loading: isLoadingMore,
            }}
            hasMoreToLoad={contacts.length < totalAvailableCount}
          />
        </Paper>
      </WrapperComponent>
    </PageWrapper>
  );
}
