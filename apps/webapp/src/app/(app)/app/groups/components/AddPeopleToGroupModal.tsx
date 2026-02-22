"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stack, Button, Group, Text, Checkbox, ScrollArea, TextInput, Loader, Center } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus, IconSearch } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { useDebouncedValue } from "@mantine/hooks";
import type { Contact } from "@bondery/types";
import { formatContactName } from "@/lib/nameHelpers";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../actions";
import { PersonChip } from "@/app/(app)/app/components/shared/PersonChip";

interface AddPeopleToGroupModalProps {
  groupId: string;
  groupLabel: string;
}

/**
 * Opens a modal that lets user select and add contacts to the provided group.
 */
export function openAddPeopleToGroupModal(props: AddPeopleToGroupModalProps) {
  modals.open({
    title: (
      <ModalTitle text={`Add people to ${props.groupLabel}`} icon={<IconUserPlus size={24} />} />
    ),
    trapFocus: true,
    size: "md",
    children: <AddPeopleToGroupForm {...props} />,
  });
}

function AddPeopleToGroupForm({ groupId, groupLabel }: AddPeopleToGroupModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);

  useEffect(() => {
    async function fetchAvailableContacts() {
      try {
        const [allContactsRes, groupContactsRes] = await Promise.all([
          fetch(API_ROUTES.CONTACTS),
          fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`),
        ]);

        if (!allContactsRes.ok || !groupContactsRes.ok) {
          throw new Error("Failed to fetch contacts");
        }

        const allContactsData = (await allContactsRes.json()) as { contacts: Contact[] };
        const groupContactsData = (await groupContactsRes.json()) as { contacts: Contact[] };

        const existingIds = new Set(groupContactsData.contacts.map((contact) => contact.id));
        setContacts(allContactsData.contacts.filter((contact) => !existingIds.has(contact.id)));
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to load contacts",
          }),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvailableContacts();
  }, [groupId]);

  const filteredContacts = debouncedSearch
    ? contacts.filter((contact) =>
        formatContactName(contact).toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : contacts;

  const handleToggle = (contactId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((contact) => contact.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      notifications.show({
        title: "No contacts selected",
        message: "Please select at least one contact to add",
        color: "yellow",
      });
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: "Adding contacts...",
        description: "Please wait while we add contacts to the group",
      }),
    });

    try {
      const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personIds: Array.from(selectedIds),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add contacts");
      }

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: `${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""} added to ${groupLabel}`,
        }),
      );

      modals.closeAll();
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add contacts",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (contacts.length === 0) {
    return (
      <Stack gap="md">
        <Text c="dimmed" ta="center">
          All your contacts are already in this group, or you don&apos;t have any contacts yet.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => modals.closeAll()}>
            Close
          </Button>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <TextInput
        placeholder="Search contacts..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      <Group justify="space-between">
        <Checkbox
          label="Select all"
          checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
          indeterminate={selectedIds.size > 0 && selectedIds.size < filteredContacts.length}
          onChange={handleSelectAll}
        />
        <Text size="sm" c="dimmed">
          {selectedIds.size} selected
        </Text>
      </Group>

      <ScrollArea h={300} type="auto">
        <Stack gap="xs">
          {filteredContacts.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              No contacts found
            </Text>
          ) : (
            filteredContacts.map((contact) => (
              <Group
                key={contact.id}
                p="xs"
                style={{
                  cursor: "pointer",
                  borderRadius: "var(--mantine-radius-sm)",
                  backgroundColor: selectedIds.has(contact.id)
                    ? "var(--mantine-color-blue-light)"
                    : undefined,
                }}
                onClick={() => handleToggle(contact.id)}
              >
                <Checkbox
                  checked={selectedIds.has(contact.id)}
                  onChange={() => handleToggle(contact.id)}
                  onClick={(event) => event.stopPropagation()}
                />
                <PersonChip person={contact} size="sm" />
              </Group>
            ))
          )}
        </Stack>
      </ScrollArea>

      <Group justify="flex-end" gap="sm">
        <Button variant="subtle" onClick={() => modals.closeAll()} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={selectedIds.size === 0}
          leftSection={<IconUserPlus size={16} />}
        >
          Add {selectedIds.size > 0 ? `${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""}` : "contacts"}
        </Button>
      </Group>
    </Stack>
  );
}