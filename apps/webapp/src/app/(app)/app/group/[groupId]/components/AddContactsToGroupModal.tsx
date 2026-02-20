"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Stack,
  Button,
  Group,
  Text,
  Checkbox,
  Avatar,
  ScrollArea,
  TextInput,
  Loader,
  Center,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus, IconSearch } from "@tabler/icons-react";
import { ModalTitle } from "@bondery/mantine-next";
import { useDebouncedValue } from "@mantine/hooks";
import type { Contact } from "@bondery/types";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import { formatContactName } from "@/lib/nameHelpers";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../../actions";

interface AddContactsToGroupModalProps {
  groupId: string;
  groupLabel: string;
  existingContactIds: string[];
}

export function openAddContactsToGroupModal(props: AddContactsToGroupModalProps) {
  modals.open({
    title: (
      <ModalTitle text={`Add people to ${props.groupLabel}`} icon={<IconUserPlus size={24} />} />
    ),
    trapFocus: true,
    size: "md",
    children: <AddContactsToGroupForm {...props} />,
  });
}

function AddContactsToGroupForm({
  groupId,
  groupLabel,
  existingContactIds,
}: AddContactsToGroupModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 200);

  // Fetch all contacts
  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch(API_ROUTES.CONTACTS);
        if (!res.ok) throw new Error("Failed to fetch contacts");
        const data = await res.json();
        // Filter out contacts already in the group
        const availableContacts = data.contacts.filter(
          (c: Contact) => !existingContactIds.includes(c.id),
        );
        setContacts(availableContacts);
      } catch (error) {
        notifications.show({
          title: "Error",
          message: "Failed to load contacts",
          color: "red",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchContacts();
  }, [existingContactIds]);

  // Filter contacts by search
  const filteredContacts = debouncedSearch
    ? contacts.filter((c) =>
        formatContactName(c).toLowerCase().includes(debouncedSearch.toLowerCase()),
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
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
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
      title: "Adding contacts...",
      message: "Please wait while we add contacts to the group",
      loading: true,
      autoClose: false,
      withCloseButton: false,
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

      notifications.show({
        title: "Success",
        message: `${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""} added to ${groupLabel}`,
        color: "green",
      });

      modals.closeAll();
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to add contacts",
        color: "red",
      });
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
        onChange={(e) => setSearch(e.currentTarget.value)}
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
                  onClick={(e) => e.stopPropagation()}
                />
                <Avatar
                  src={contact.avatar || undefined}
                  color={getAvatarColorFromName(contact.firstName, contact.lastName)}
                  radius="xl"
                  size="sm"
                  name={formatContactName(contact)}
                />

                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {formatContactName(contact)}
                  </Text>
                  {contact.title && (
                    <Text size="xs" c="dimmed">
                      {contact.title}
                    </Text>
                  )}
                </Stack>
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
          Add{" "}
          {selectedIds.size > 0
            ? `${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""}`
            : "contacts"}
        </Button>
      </Group>
    </Stack>
  );
}
