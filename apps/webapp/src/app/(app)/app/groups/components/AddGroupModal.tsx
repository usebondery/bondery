"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  EmojiPicker,
  errorNotificationTemplate,
  getRandomEmoji,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact, GroupWithCount } from "@bondery/schemas";
import { createGroupSchema } from "@bondery/schemas";
import {
  Box,
  Center,
  ColorInput,
  DEFAULT_THEME,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUsersGroup } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { useCommonTranslations, useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useContactsSelectableListQuery } from "@/lib/query/hooks/useContacts";
import {
  useAddContactsToGroupByIdMutation,
  useCreateGroupMutation,
} from "@/lib/query/hooks/useGroups";

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
  initialLabel?: string;
  initialSelectedIds?: string[];
  onCreated?: (group: GroupWithCount) => void;
}

function AddGroupModalTitle() {
  const t = useWebTranslations("GroupsPage");
  return <ModalTitle icon={<IconUsersGroup size={24} />} text={t("AddGroupModal.Title")} />;
}

export function openAddGroupModal(options: OpenAddGroupModalOptions = {}) {
  const modalId = createModalId("add-group");

  modals.open({
    children: (
      <AddGroupForm
        initialLabel={options.initialLabel}
        initialSelectedIds={options.initialSelectedIds}
        modalId={modalId}
        onCreated={options.onCreated}
      />
    ),
    modalId,
    size: "md",
    title: <AddGroupModalTitle />,
    trapFocus: true,
  });
}

interface AddGroupFormProps {
  initialLabel?: string;
  initialSelectedIds?: string[];
  modalId: string;
  onCreated?: (group: GroupWithCount) => void;
}

function AddGroupForm({
  modalId,
  initialSelectedIds = [],
  initialLabel = "",
  onCreated,
}: AddGroupFormProps) {
  const tCommon = useCommonTranslations();
  const t = useWebTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const {
    data: contactsData,
    isLoading: isLoadingContacts,
    isError: isContactsError,
  } = useContactsSelectableListQuery({ limit: 200 });
  const createGroupMutation = useCreateGroupMutation();
  const addContactsMutation = useAddContactsToGroupByIdMutation();
  const contacts = contactsData?.contacts ?? [];

  useEffect(() => {
    if (isContactsError) {
      notifications.show(
        errorNotificationTemplate({
          description: t("AddGroupModal.LoadContactsError"),
          title: t("AddGroupModal.ErrorTitle"),
        }),
      );
    }
  }, [isContactsError, t]);

  const isBlocking = isSubmitting || isLoadingContacts;
  const { closeModal, closeModalSync } = useModalDismiss(modalId, isBlocking);

  const form = useForm({
    initialValues: {
      color: getRandomColor(),
      emoji: getRandomEmoji(),
      label: initialLabel,
    },
    mode: "controlled",
    validate: schemaResolver(createGroupSchema, { sync: true }),
  });

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("AddGroupModal.LoadingDescription"),
        title: t("AddGroupModal.LoadingTitle"),
      }),
    });

    try {
      const createdGroupData = await createGroupMutation.mutateAsync({
        color: values.color.trim(),
        emoji: values.emoji.trim(),
        label: values.label.trim(),
      });

      const groupId = createdGroupData.group?.id;
      if (!groupId) {
        throw new Error("Failed to parse new group id");
      }

      if (selectedIds.length > 0) {
        await addContactsMutation.mutateAsync({ contactIds: selectedIds, groupId });
      }

      captureEvent("group_created");

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          description: t("AddGroupModal.SuccessDescription"),
          title: t("AddGroupModal.SuccessTitle"),
        }),
      );

      if (onCreated) {
        const newGroup: GroupWithCount = {
          color: values.color.trim(),
          contactCount: selectedIds.length,
          createdAt: new Date().toISOString(),
          emoji: values.emoji.trim(),
          id: groupId,
          label: values.label.trim(),
          previewContacts: [],
          updatedAt: new Date().toISOString(),
          userId: "",
        };
        closeModalSync();
        onCreated(newGroup);
      } else {
        closeModal();
      }
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: t("AddGroupModal.ErrorTitle"),
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
              error={form.errors.emoji as string | undefined}
              onChange={(emoji) => form.setFieldValue("emoji", emoji)}
              searchDebounceMs={DEBOUNCE_MS.localFilter}
              value={form.values.emoji}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              data-autofocus
              label={t("AddGroupModal.LabelInput")}
              placeholder={t("AddGroupModal.LabelPlaceholder")}
              required
              withAsterisk
              {...form.getInputProps("label")}
            />
          </Box>
        </Group>

        <ColorInput
          closeOnColorSwatchClick
          format="hex"
          label={t("AddGroupModal.ColorInput")}
          placeholder={t("AddGroupModal.ColorPlaceholder")}
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          withAsterisk
          {...form.getInputProps("color")}
        />

        <Stack gap="xs">
          <Text fw={500} size="sm">
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
              disabled={isSubmitting}
              noResultsLabel={t("AddGroupModal.NoContactsFound")}
              onChange={setSelectedIds}
              onSearch={searchContacts}
              placeholder={t("AddGroupModal.AddContactsPlaceholder")}
              searchDebounceMs={DEBOUNCE_MS.contactPicker}
              selectedIds={selectedIds}
            />
          )}
        </Stack>

        <ModalFooter
          actionDisabled={isSubmitting}
          actionLabel={t("AddGroupModal.CreateGroup")}
          actionLeftSection={<IconUsersGroup size={16} />}
          actionLoading={isSubmitting}
          actionType="submit"
          cancelDisabled={isSubmitting}
          cancelLabel={t("AddGroupModal.Cancel")}
          onCancel={closeModal}
        />
      </Stack>
    </form>
  );
}
