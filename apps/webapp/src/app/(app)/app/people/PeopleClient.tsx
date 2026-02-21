"use client";

import { Title, Text, Button, Stack, Group, TextInput, Paper } from "@mantine/core";
import {
  IconAddressBook,
  IconSearch,
  IconUserPlus,
  IconUsers,
  IconTrash,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconNote,
  IconClock,
  IconBrandLinkedin,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState, useDeferredValue } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import ContactsTable, {
  ColumnConfig,
  MenuAction,
  BulkSelectionAction,
} from "@/app/(app)/app/components/ContactsTable";
import { ColumnVisibilityMenu } from "@/app/(app)/app/components/contacts/ColumnVisibilityMenu";
import { SortMenu, SortOrder } from "@/app/(app)/app/components/contacts/SortMenu";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { openAddContactModal } from "./components/AddContactModal";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import { errorNotificationTemplate, successNotificationTemplate } from "@bondery/mantine-next";

import type { Contact } from "@bondery/types";
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

  // Get initial state from URL params
  const initialSearch = searchParams.get("q") || "";
  const initialSort = (searchParams.get("sort") as SortOrder) || "nameAsc";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [loadedCount, setLoadedCount] = useState(initialContacts.length);
  const [totalAvailableCount, setTotalAvailableCount] = useState(totalCount);
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
      key: "shortNote",
      label: "Short Note",
      visible: true,
      icon: <IconNote size={16} />,
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

  const handleDeleteContact = async (contactId: string) => {
    await handleDelete([contactId]);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
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

  const handleDelete = async (idsOverride?: string[]) => {
    const ids = idsOverride ?? Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsDeleting(true);

    try {
      const res = await fetch(API_ROUTES.CONTACTS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete contacts");
      }

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${ids.length} contact(s) deleted successfully`,
        }),
      );

      // Clear selection
      setSelectedIds(new Set());
      setContacts((prev) => prev.filter((contact) => !ids.includes(contact.id)));
      setLoadedCount((prev) => Math.max(0, prev - ids.length));
      setTotalAvailableCount((prev) => Math.max(0, prev - ids.length));

      // Refresh the page to show updated data
      await revalidateContacts();
      router.refresh();
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: "Failed to delete contacts. Please try again.",
        }),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < contacts.length;

  // Define menu actions for individual contacts
  const menuActions: MenuAction[] = [
    {
      key: "deleteContact",
      label: "Delete contact",
      icon: <IconTrash size={14} />,
      color: "red",
      onClick: handleDeleteContact,
    },
  ];

  // Define bulk selection actions
  const bulkSelectionActions: BulkSelectionAction[] = [
    {
      key: "deleteSelected",
      label: "Delete contacts",
      icon: <IconTrash size={16} />,
      color: "red",
      variant: "light",
      onClick: () => handleDelete(),
      loading: isDeleting,
    },
  ];

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
          <Stack>
            <Group>
              <TextInput
                placeholder="Search by name..."
                leftSection={<IconSearch size={16} />}
                defaultValue={initialSearch}
                onChange={(e) => handleSearch(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <ColumnVisibilityMenu columns={columns} setColumns={setColumns} />
              <SortMenu sortOrder={initialSort} setSortOrder={handleSort} />
            </Group>

            <ContactsTable
              contacts={contacts}
              selectedIds={selectedIds}
              visibleColumns={visibleColumns}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              allSelected={allSelected}
              someSelected={someSelected}
              showSelection={true}
              menuActions={menuActions}
              bulkSelectionActions={bulkSelectionActions}
            />

            {contacts.length < totalAvailableCount ? (
              <Group justify="center" pt="sm">
                <Button variant="light" onClick={handleLoadMore} loading={isLoadingMore}>
                  Load another 50 contacts
                </Button>
              </Group>
            ) : null}
          </Stack>
        </Paper>
      </WrapperComponent>
    </PageWrapper>
  );
}
