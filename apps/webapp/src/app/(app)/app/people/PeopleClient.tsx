"use client";

import { Title, Text, Button, Stack, Group, TextInput, Paper, SimpleGrid } from "@mantine/core";
import {
  IconSearch,
  IconPlus,
  IconUsers,
  IconMessageCircle,
  IconUserPlus,
  IconTrash,
  IconPhoto,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconNote,
  IconClock,
  IconBrandLinkedin,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { StatsCard } from "./components/StatsCard";
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
import { API_ROUTES } from "@bondery/helpers";
import { openAddContactModal } from "./components/AddContactModal";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { PageWrapper } from "@/app/(app)/app/components/PageWrapper";

import type { Contact } from "@bondery/types";

interface Stats {
  totalContacts: number;
  thisMonthInteractions: number;
  newContactsThisYear: number;
}

interface PeopleClientProps {
  initialContacts: Contact[];
  totalCount: number;
  stats: Stats;
  layout?: "stack" | "container";
}

export function PeopleClient({
  initialContacts,
  totalCount,
  stats,
  layout = "stack",
}: PeopleClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial state from URL params
  const initialSearch = searchParams.get("q") || "";
  const initialSort = (searchParams.get("sort") as SortOrder) || "nameAsc";

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
    if (selectedIds.size === initialContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(initialContacts.map((c) => c.id)));
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

      notifications.show({
        title: "Success",
        message: `${ids.length} contact(s) deleted successfully`,
        color: "green",
      });

      // Clear selection
      setSelectedIds(new Set());

      // Refresh the page to show updated data
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

  const allSelected = initialContacts.length > 0 && selectedIds.size === initialContacts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < initialContacts.length;

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
          action={
            <Button size="md" leftSection={<IconPlus size={16} />} onClick={openAddContactModal}>
              Add new person
            </Button>
          }
        />

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <StatsCard
            title="Total Contacts"
            value={stats.totalContacts}
            description="People in your network"
            icon={<IconUsers size={32} stroke={1.5} />}
            color="blue"
          />
          <StatsCard
            title="This Month's Interactions"
            value={stats.thisMonthInteractions}
            description="Contacts you've interacted with"
            icon={<IconMessageCircle size={32} stroke={1.5} />}
            color="green"
          />
          <StatsCard
            title="New Contacts This Year"
            value={stats.newContactsThisYear}
            description="Added in 2026"
            icon={<IconUserPlus size={32} stroke={1.5} />}
            color="violet"
          />
        </SimpleGrid>

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
              contacts={initialContacts}
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
      </WrapperComponent>
    </PageWrapper>
  );
}
