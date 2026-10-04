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
import { useEffect, useRef, useState } from "react";
import { captureEvent } from "@/lib/analytics/client";
import { searchContactsPage } from "@/lib/contacts/searchContacts";
import { useCommonTranslations, useGroupsPageTranslations } from "@/lib/i18n/generated/hooks";
import { createModalId, useCreateMore, useModalDismiss } from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useContactsSelectableListQuery } from "@/lib/query/hooks/useContacts";
import {
  useAddContactsToGroupByIdMutation,
  useCreateGroupMutation,
} from "@/lib/query/hooks/useGroups";
import { SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";

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
  repeatable?: boolean;
}

function AddGroupModalTitle() {
  const t = useGroupsPageTranslations();
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
        repeatable={options.repeatable}
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
  repeatable?: boolean;
}

function AddGroupForm({
  modalId,
  initialSelectedIds = [],
  initialLabel = "",
  onCreated,
  repeatable = true,
}: AddGroupFormProps) {
  const tCommon = useCommonTranslations();
  const t = useGroupsPageTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const { createMore, setCreateMore } = useCreateMore({ enabled: repeatable });
  const labelInputRef = useRef<HTMLInputElement>(null);
  const {
    data: contactsData,
    isLoading: isLoadingContacts,
    isError: isContactsError,
  } = useContactsSelectableListQuery(SELECTABLE_CONTACTS);
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
      const created = await createGroupMutation.mutateAsync({
        color: values.color.trim(),
        emoji: values.emoji.trim(),
        label: values.label.trim(),
      });

      const groupId = created.id;

      if (selectedIds.length > 0) {
        await addContactsMutation.mutateAsync({ contactIds: selectedIds, groupId });
      }

      captureEvent("groups:group_create");

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          description: t("AddGroupModal.SuccessDescription"),
          title: t("AddGroupModal.SuccessTitle"),
        }),
      );

      if (repeatable && createMore) {
        form.setValues({
          color: getRandomColor(),
          emoji: getRandomEmoji(),
          label: "",
        });
        form.clearErrors();
        setSelectedIds([]);
        setIsSubmitting(false);
        queueMicrotask(() => labelInputRef.current?.focus());
        return;
      }

      if (onCreated) {
        const newGroup: GroupWithCount = {
          ...created,
          contactCount: selectedIds.length,
          previewContacts: [],
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
              disabled={isBlocking}
              emptyLabel={t("EmojiEmptySearch")}
              error={form.errors.emoji as string | undefined}
              onChange={(emoji) => form.setFieldValue("emoji", emoji)}
              searchDebounceMs={DEBOUNCE_MS.localFilter}
              searchPlaceholder={t("EmojiSearchPlaceholder")}
              value={form.values.emoji}
            />
          </Box>
          <Box style={{ flex: 1 }}>
            <TextInput
              data-autofocus
              disabled={isBlocking}
              label={t("AddGroupModal.LabelInput")}
              placeholder={t("AddGroupModal.LabelPlaceholder")}
              required
              withAsterisk
              {...form.getInputProps("label")}
              ref={labelInputRef}
            />
          </Box>
        </Group>

        <ColorInput
          closeOnColorSwatchClick
          disabled={isBlocking}
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
              contactsHasMore={contactsData?.pagination.hasMore ?? false}
              disabled={isBlocking}
              loadingMoreLabel={t("AddGroupModal.LoadingMoreLabel")}
              loadMoreErrorLabel={t("AddGroupModal.LoadMoreError")}
              loadMoreRetryLabel={t("AddGroupModal.LoadMoreRetry")}
              noResultsLabel={t("AddGroupModal.NoContactsFound")}
              onChange={setSelectedIds}
              onSearch={searchContactsPage}
              placeholder={t("AddGroupModal.AddContactsPlaceholder")}
              searchDebounceMs={DEBOUNCE_MS.search}
              searchingLabel={t("AddGroupModal.SearchingLabel")}
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
          {...(repeatable
            ? {
                createMoreAriaDescription: tCommon("a11y.createMore"),
                createMoreChecked: createMore,
                createMoreDisabled: isBlocking,
                createMoreLabel: tCommon("actions.createMore"),
                onCreateMoreChange: setCreateMore,
              }
            : {})}
        />
      </Stack>
    </form>
  );
}
