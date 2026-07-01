"use client";

import { useEffect, useState } from "react";
import {
  Stack,
  TextInput,
  Group,
  Text,
  Center,
  Loader,
  ColorInput,
  DEFAULT_THEME,
  Box,
} from "@mantine/core";
import { useForm, schemaResolver } from "@mantine/form";
import { createGroupSchema } from "@bondery/schemas";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUsersGroup } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
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
import type { Contact, GroupWithCount } from "@bondery/schemas";
import { DEBOUNCE_MS } from "@/lib/config";
import { searchContacts } from "@/lib/searchContacts";
import { captureEvent } from "@/lib/analytics/client";
import { useContactsListQuery } from "@/lib/query/hooks/useContacts";
import {
  useAddContactsToGroupByIdMutation,
  useCreateGroupMutation,
} from "@/lib/query/hooks/useGroups";
import { createModalId, useModalBlocking } from "@/lib/modals";

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

function AddGroupModalTitle() {
  const t = useTranslations("GroupsPage");
  return <ModalTitle text={t("AddGroupModal.Title")} icon={<IconUsersGroup size={24} />} />;
}

export function openAddGroupModal(options: OpenAddGroupModalOptions = {}) {
  const modalId = createModalId("add-group");

  modals.open({
    modalId,
    title: <AddGroupModalTitle />,
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
  const t = useTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const { data: contactsData, isLoading: isLoadingContacts, isError: isContactsError } =
    useContactsListQuery({ limit: 200 });
  const createGroupMutation = useCreateGroupMutation();
  const addContactsMutation = useAddContactsToGroupByIdMutation();
  const contacts = contactsData?.contacts ?? [];

  useEffect(() => {
    if (isContactsError) {
      notifications.show(
        errorNotificationTemplate({
          title: t("AddGroupModal.ErrorTitle"),
          description: t("AddGroupModal.LoadContactsError"),
        }),
      );
    }
  }, [isContactsError, t]);

  const isBlocking = isSubmitting || isLoadingContacts;
  useModalBlocking(modalId, isBlocking);

  const form = useForm({
    mode: "controlled",
    initialValues: {
      label: initialLabel,
      emoji: getRandomEmoji(),
      color: getRandomColor(),
    },
    validate: schemaResolver(createGroupSchema, { sync: true }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("AddGroupModal.LoadingTitle"),
        description: t("AddGroupModal.LoadingDescription"),
      }),
    });

    try {
      const createdGroupData = await createGroupMutation.mutateAsync({
        label: values.label.trim(),
        emoji: values.emoji.trim(),
        color: values.color.trim(),
      });

      const groupId = createdGroupData.group?.id;
      if (!groupId) {
        throw new Error("Failed to parse new group id");
      }

      if (selectedIds.length > 0) {
        await addContactsMutation.mutateAsync({ groupId, contactIds: selectedIds });
      }

      captureEvent("group_created");

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: t("AddGroupModal.SuccessTitle"),
          description: t("AddGroupModal.SuccessDescription"),
        }),
      );

      if (onCreated) {
        const newGroup: GroupWithCount = {
          id: groupId,
          userId: "",
          label: values.label.trim(),
          emoji: values.emoji.trim(),
          color: values.color.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          contactCount: selectedIds.length,
          previewContacts: [],
        };
        flushSync(() => modals.close(modalId));
        onCreated(newGroup);
      } else {
        modals.close(modalId);
      }
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: t("AddGroupModal.ErrorTitle"),
          description: error instanceof Error ? error.message : t("AddGroupModal.CreateFailed"),
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
              searchDebounceMs={DEBOUNCE_MS.localFilter}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              label={t("AddGroupModal.LabelInput")}
              placeholder={t("AddGroupModal.LabelPlaceholder")}
              withAsterisk
              required
              data-autofocus
              {...form.getInputProps("label")}
            />
          </Box>
        </Group>

        <ColorInput
          label={t("AddGroupModal.ColorInput")}
          placeholder={t("AddGroupModal.ColorPlaceholder")}
          withAsterisk
          format="hex"
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          closeOnColorSwatchClick
          {...form.getInputProps("color")}
        />

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {t("AddGroupModal.AddPeople")}
          </Text>

          {isLoadingContacts ? (
            <Center py="xs">
              <Loader size="sm" />
            </Center>
          ) : contacts.length === 0 ? (
            <Text c="dimmed" size="sm">
              {t("AddGroupModal.NoContactsFound")}
            </Text>
          ) : (
            <PeopleMultiPickerInput
              contacts={contacts as Contact[]}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              placeholder={t("AddGroupModal.AddContactsPlaceholder")}
              noResultsLabel={t("AddGroupModal.NoContactsFound")}
              onSearch={searchContacts}
              searchDebounceMs={DEBOUNCE_MS.contactPicker}
              disabled={isSubmitting}
            />
          )}
        </Stack>

        <ModalFooter
          cancelLabel={t("AddGroupModal.Cancel")}
          onCancel={() => modals.close(modalId)}
          cancelDisabled={isSubmitting}
          actionLabel={t("AddGroupModal.CreateGroup")}
          actionType="submit"
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting}
          actionLeftSection={<IconUsersGroup size={16} />}
        />
      </Stack>
    </form>
  );
}
