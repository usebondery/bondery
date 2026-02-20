"use client";

import { Text, Stack, Group, Paper, Button, TextInput } from "@mantine/core";
import {
  IconUsersGroup,
  IconPhoto,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconNote,
  IconClock,
  IconBrandLinkedin,
  IconUserPlus,
  IconSearch,
  IconUserMinus,
  IconTrash,
} from "@tabler/icons-react";
import ContactsTable, { ColumnConfig, MenuAction } from "@/app/(app)/app/components/ContactsTable";
import { ColumnVisibilityMenu } from "@/app/(app)/app/components/contacts/ColumnVisibilityMenu";
import { SortMenu, type SortOrder } from "@/app/(app)/app/components/contacts/SortMenu";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";
import type { Contact } from "@bondery/types";
import { useDeferredValue, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import { openAddContactsToGroupModal } from "./components/AddContactsToGroupModal";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { formatContactName } from "@/lib/nameHelpers";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { notifications } from "@mantine/notifications";
import { revalidateContacts, revalidateGroups } from "../../actions";

interface GroupDetailClientProps {
  groupId: string;
  groupLabel: string;
  initialContacts: Contact[];
  totalCount: number;
}

export function GroupDetailClient({
  groupId,
  groupLabel,
  initialContacts,
  totalCount,
}: GroupDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") as SortOrder | null;
  const sortOrder: SortOrder =
    sortParam === "nameAsc" ||
    sortParam === "nameDesc" ||
    sortParam === "surnameAsc" ||
    sortParam === "surnameDesc" ||
    sortParam === "interactionAsc" ||
    sortParam === "interactionDesc"
      ? sortParam
      : "nameAsc";
  const [searchValue, setSearchValue] = useState(initialSearch);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [columns, setColumns] = useState<ColumnConfig[]>([
    {
      key: "avatar",
      label: "Avatar",
      visible: true,
      icon: <IconPhoto size={16} />,
      fixed: true,
    },
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

  // Defer the columns update to prevent UI freezing
  const deferredColumns = useDeferredValue(columns);
  const visibleColumns = deferredColumns.filter((c) => c.visible);

  const existingContactIds = initialContacts.map((c) => c.id);

  const handleSortChange = (order: SortOrder) => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", order);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((query: string) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    router.replace(`${pathname}?${params.toString()}`);
  }, 300);

  const filteredAndSortedContacts = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();
    const filtered = normalizedQuery
      ? initialContacts.filter((contact) =>
          formatContactName(contact).toLowerCase().includes(normalizedQuery),
        )
      : initialContacts;

    const nameValue = (contact: Contact) => formatContactName(contact).toLowerCase();
    const surnameValue = (contact: Contact) => contact.lastName?.toLowerCase() || "";
    const interactionValue = (contact: Contact): number | null => {
      if (!contact.lastInteraction) return null;
      return typeof contact.lastInteraction === "string"
        ? new Date(contact.lastInteraction).getTime()
        : new Date(contact.lastInteraction).getTime();
    };

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "nameDesc":
          return nameValue(b).localeCompare(nameValue(a));
        case "surnameAsc":
          return (
            surnameValue(a).localeCompare(surnameValue(b)) ||
            nameValue(a).localeCompare(nameValue(b))
          );
        case "surnameDesc":
          return (
            surnameValue(b).localeCompare(surnameValue(a)) ||
            nameValue(b).localeCompare(nameValue(a))
          );
        case "interactionAsc": {
          const aVal = interactionValue(a) ?? Infinity;
          const bVal = interactionValue(b) ?? Infinity;
          return aVal - bVal;
        }
        case "interactionDesc": {
          const aVal = interactionValue(a) ?? -Infinity;
          const bVal = interactionValue(b) ?? -Infinity;
          return bVal - aVal;
        }
        case "nameAsc":
        default:
          return nameValue(a).localeCompare(nameValue(b));
      }
    });

    return sorted;
  }, [initialContacts, searchValue, sortOrder]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedContacts.map((c) => c.id)));
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

  const handleBulkRemoveFromGroup = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const loadingId = notifications.show({
      title: "Removing contacts",
      message: "Updating group members...",
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: ids }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove contacts from group");
      }

      notifications.update({
        id: loadingId,
        title: "Success",
        message: `${ids.length} contact(s) removed from group successfully`,
        color: "green",
        loading: false,
        autoClose: 2500,
        withCloseButton: true,
      });

      setSelectedIds(new Set());
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      console.error("Error removing contacts from group", error);
      notifications.update({
        id: loadingId,
        title: "Error",
        message: "Could not remove contacts from group. Please try again.",
        color: "red",
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
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

      notifications.show({
        title: "Success",
        message: `${ids.length} contact(s) deleted successfully`,
        color: "green",
      });

      setSelectedIds(new Set());
      await revalidateContacts();
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete contacts. Please try again.",
        color: "red",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const removeFromGroup = async (contactId: string) => {
    const loadingId = notifications.show({
      title: "Removing contact",
      message: "Updating group members...",
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: [contactId] }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove contact from group");
      }

      notifications.update({
        id: loadingId,
        title: "Success",
        message: "Contact removed from group successfully",
        color: "green",
        loading: false,
        autoClose: 2500,
        withCloseButton: true,
      });

      await revalidateGroups();
      router.refresh();
    } catch (error) {
      console.error("Error removing contact from group", error);
      notifications.update({
        id: loadingId,
        title: "Error",
        message: "Could not remove contact from group. Please try again.",
        color: "red",
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });
    }
  };

  const deleteContact = async (contactId: string) => {
    const contactName = formatContactName(
      initialContacts.find((c) => c.id === contactId) || ({} as Contact),
    );

    const loadingId = notifications.show({
      title: "Deleting contact",
      message: `Deleting ${contactName}...`,
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const res = await fetch(API_ROUTES.CONTACTS, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [contactId] }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete contact");
      }

      notifications.update({
        id: loadingId,
        title: "Success",
        message: `${contactName} deleted successfully`,
        color: "green",
        loading: false,
        autoClose: 2500,
        withCloseButton: true,
      });

      await revalidateContacts();
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      console.error("Error deleting contact", error);
      notifications.update({
        id: loadingId,
        title: "Error",
        message: "Could not delete contact. Please try again.",
        color: "red",
        loading: false,
        autoClose: 4000,
        withCloseButton: true,
      });
    }
  };

  // Computed selection values
  const allSelected =
    filteredAndSortedContacts.length > 0 && selectedIds.size === filteredAndSortedContacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredAndSortedContacts.length;

  // Define bulk selection actions
  const bulkSelectionActions = [
    {
      key: "removeFromGroup",
      label: "Remove from group",
      icon: <IconUserMinus size={16} />,
      variant: "light" as const,
      onClick: () => handleBulkRemoveFromGroup(),
    },
    {
      key: "deleteSelected",
      label: "Delete contacts",
      icon: <IconTrash size={16} />,
      color: "red",
      variant: "light" as const,
      onClick: () => handleBulkDelete(),
      loading: isDeleting,
    },
  ];

  // Define menu actions for individual contacts
  const menuActions: MenuAction[] = [
    {
      key: "removeFromGroup",
      label: "Remove from group",
      icon: <IconUserMinus size={14} />,
      onClick: removeFromGroup,
    },
    {
      key: "deleteContact",
      label: "Delete contact",
      icon: <IconTrash size={14} />,
      color: "red",
      onClick: deleteContact,
    },
  ];

  const handleAddContacts = () => {
    openAddContactsToGroupModal({
      groupId,
      groupLabel,
      existingContactIds,
    });
  };

  return (
    <PageWrapper>
      <Stack gap="xl">
        <PageHeader
          icon={IconUsersGroup}
          title={groupLabel}
          backHref={WEBAPP_ROUTES.GROUPS}
          action={
            <Button size="md" leftSection={<IconUserPlus size={16} />} onClick={handleAddContacts}>
              Add people to group
            </Button>
          }
        />

        <Paper withBorder shadow="sm" radius="md" p="md">
          <Stack>
            <Group justify="space-between">
              <TextInput
                placeholder="Search by name..."
                leftSection={<IconSearch size={16} />}
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.currentTarget.value);
                  handleSearch(e.currentTarget.value);
                }}
                style={{ flex: 1, minWidth: 200 }}
              />
              <ColumnVisibilityMenu columns={columns} setColumns={setColumns} />
              <SortMenu sortOrder={sortOrder} setSortOrder={handleSortChange} />
            </Group>

            <ContactsTable
              contacts={filteredAndSortedContacts}
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
          </Stack>
        </Paper>
      </Stack>
    </PageWrapper>
  );
}
