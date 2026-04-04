"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Center,
  Loader,
  ColorInput,
  DEFAULT_THEME,
  Box,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUsersGroup } from "@tabler/icons-react";
import {
  PeopleMultiPickerInput,
  EmojiPicker,
  errorNotificationTemplate,
  getRandomEmoji,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { flushSync } from "react-dom";
import type { Contact, GroupWithCount } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import { DEBOUNCE_MS } from "@/lib/config";
import { searchContacts } from "@/lib/searchContacts";
import { revalidateGroups } from "../../actions";
import { captureEvent } from "@/lib/analytics/client";

// Predefined color swatches
const COLOR_SWATCHES = [
  ...DEFAULT_THEME.colors.red.slice(5, 8),
  ...DEFAULT_THEME.colors.pink.slice(5, 8),
  ...DEFAULT_THEME.colors.grape.slice(5, 8),
  ...DEFAULT_THEME.colors.violet.slice(5, 8),
  ...DEFAULT_THEME.colors.indigo.slice(5, 8),
  ...DEFAULT_THEME.colors.blue.slice(5, 8),
  ...DEFAULT_THEME.colors.cyan.slice(5, 8),
  ...DEFAULT_THEME.colors.teal.slice(5, 8),
  ...DEFAULT_THEME.colors.green.slice(5, 8),
  ...DEFAULT_THEME.colors.lime.slice(5, 8),
  ...DEFAULT_THEME.colors.yellow.slice(5, 8),
  ...DEFAULT_THEME.colors.orange.slice(5, 8),
];

// Get a random color from swatches
function getRandomColor(): string {
  return COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)];
}

interface OpenAddGroupModalOptions {
  initialSelectedIds?: string[];
  initialLabel?: string;
  onCreated?: (group: GroupWithCount) => void;
}

export function openAddGroupModal(options: OpenAddGroupModalOptions = {}) {
  const modalId = `add-group-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title: <ModalTitle text="Add new group" icon={<IconUsersGroup size={24} />} />,
    trapFocus: true,
    size: "md",
    children: (
      <AddGroupForm
        modalId={modalId}
        initialSelectedIds={options.initialSelectedIds}
        initialLabel={options.initialLabel}
        onCreated={options.onCreated}
      />
    ),
  });
}

interface AddGroupFormProps {
  modalId: string;
  initialSelectedIds?: string[];
  initialLabel?: string;
  onCreated?: (group: GroupWithCount) => void;
}

function AddGroupForm({
  modalId,
  initialSelectedIds = [],
  initialLabel = "",
  onCreated,
}: AddGroupFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnEscape: !isSubmitting,
      closeOnClickOutside: !isSubmitting,
      withCloseButton: !isSubmitting,
    });
  }, [isSubmitting, modalId]);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const response = await fetch(
          `${API_ROUTES.CONTACTS}?limit=200&${buildAvatarQueryString("small")}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch contacts");
        }

        const data = (await response.json()) as { contacts?: Contact[] };
        setContacts(data.contacts || []);
      } catch {
        notifications.show(
          errorNotificationTemplate({
            title: "Error",
            description: "Failed to load contacts",
          }),
        );
      } finally {
        setIsLoadingContacts(false);
      }
    }

    void fetchContacts();
  }, []);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      label: initialLabel,
      emoji: getRandomEmoji(),
      color: getRandomColor(),
    },
    validate: {
      label: (value) =>
        value.trim().length === 0
          ? "Please add a label"
          : value.length > 100
            ? "Label must be 100 characters or less"
            : null,
      emoji: (value) => (value.trim().length === 0 ? "Please select an emoji" : null),
      color: (value) => (value.trim().length === 0 ? "Please select a color" : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: "Creating group...",
        description: "Please wait while we create the new group",
      }),
    });

    try {
      const res = await fetch(API_ROUTES.GROUPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: values.label.trim(),
          emoji: values.emoji.trim(),
          color: values.color.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create group");
      }

      const createdGroupData = (await res.json()) as { id?: string };

      if (!createdGroupData.id) {
        throw new Error("Failed to parse new group id");
      }

      if (selectedIds.length > 0) {
        const addPeopleResponse = await fetch(
          `${API_ROUTES.GROUPS}/${createdGroupData.id}/contacts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personIds: selectedIds }),
          },
        );

        if (!addPeopleResponse.ok) {
          const addPeopleError = await addPeopleResponse.json();
          throw new Error(addPeopleError.error || "Failed to add contacts to group");
        }
      }

      captureEvent("group_created");

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: "Success",
          description: "Group created successfully",
        }),
      );

      if (onCreated) {
        // Build a local GroupWithCount from form values so the parent modal
        // can immediately reflect the new group without a server round-trip.
        const newGroup: GroupWithCount = {
          id: createdGroupData.id!,
          userId: "",
          label: values.label.trim(),
          emoji: values.emoji.trim(),
          color: values.color.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contactCount: selectedIds.length,
          previewContacts: [],
        };
        // Always revalidate so the page list is fresh even if the parent
        // modal is dismissed without hitting "Edit groups".
        void revalidateGroups();
        router.refresh();
        // flushSync ensures the modal is torn down before the parent callback
        // triggers state updates, avoiding the React 18 batching race.
        flushSync(() => modals.close(modalId));
        onCreated(newGroup);
      } else {
        modals.close(modalId);
        await revalidateGroups();
        router.refresh();
      }
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create group",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Group align="flex-start" gap="md">
          <Box style={{ width: 80 }}>
            <EmojiPicker
              value={form.values.emoji}
              onChange={(emoji) => form.setFieldValue("emoji", emoji)}
              error={form.errors.emoji as string | undefined}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              label="Label"
              placeholder="e.g., Family, Work, Friends"
              withAsterisk
              required
              data-autofocus
              {...form.getInputProps("label")}
            />
          </Box>
        </Group>

        <ColorInput
          label="Color"
          placeholder="Pick a color"
          withAsterisk
          format="hex"
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          closeOnColorSwatchClick
          {...form.getInputProps("color")}
        />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Add people
          </Text>

          {isLoadingContacts ? (
            <Center py="xs">
              <Loader size="sm" />
            </Center>
          ) : contacts.length === 0 ? (
            <Text c="dimmed" size="sm">
              No contacts found
            </Text>
          ) : (
            <PeopleMultiPickerInput
              contacts={contacts}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              placeholder="Add contacts..."
              noResultsLabel="No contacts found"
              onSearch={searchContacts}
              searchDebounceMs={DEBOUNCE_MS.contactPicker}
              disabled={isSubmitting}
            />
          )}
        </Stack>

        <ModalFooter
          cancelLabel="Cancel"
          onCancel={() => modals.close(modalId)}
          cancelDisabled={isSubmitting}
          actionLabel="Create group"
          actionType="submit"
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting}
          actionLeftSection={<IconUsersGroup size={16} />}
        />
      </Stack>
    </form>
  );
}
