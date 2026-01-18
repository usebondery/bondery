"use client";

import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  TextInput,
  Paper,
  SimpleGrid,
} from "@mantine/core";
import {
  IconTopologyFull,
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
import { StatsCard } from "@/components/StatsCard";
import { useState, useDeferredValue } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "@mantine/hooks";
import ContactsTable, { ColumnConfig } from "@/components/ContactsTable";
import { ColumnVisibilityMenu } from "./components/ColumnVisibilityMenu";
import { SortMenu, SortOrder } from "./components/SortMenu";
import { openAddContactModal } from "@/components/AddContactModal";

import type { Contact } from "@/lib/mockData";

interface Stats {
  totalContacts: number;
  thisMonthInteractions: number;
  newContactsThisYear: number;
}

interface RelationshipsClientProps {
  initialContacts: Contact[];
  totalCount: number;
  stats: Stats;
}

export function RelationshipsClient({
  initialContacts,
  totalCount,
  stats,
}: RelationshipsClientProps) {
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
    },
    { key: "name", label: "Name", visible: true, icon: <IconUser size={16} /> },
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

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);

    try {
      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete contacts");
      }

      notifications.show({
        title: "Success",
        message: `${selectedIds.size} contact(s) deleted successfully`,
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

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Group gap="sm">
            <IconTopologyFull size={32} stroke={1.5} />
            <Title order={1}>My relationships</Title>
          </Group>
          <Button size="md" leftSection={<IconPlus size={16} />} onClick={openAddContactModal}>
            Add new contact
          </Button>
        </Group>

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
            <Group>
              {selectedIds.size > 0 && (
                <>
                  <Text size="sm" c="dimmed">
                    {selectedIds.size} selected
                  </Text>
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconTrash size={16} />}
                    onClick={handleDelete}
                    loading={isDeleting}
                  >
                    Delete contacts
                  </Button>
                </>
              )}
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
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
