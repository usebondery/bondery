"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import {
  type ContactPreview,
  type ContactSelectable,
  createTagSchema,
  type TagWithCount,
} from "@bondery/schemas";
import {
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
import { IconTag, IconTagPlus, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { captureEvent } from "@/lib/analytics/client";
import { getContactsSelectableList } from "@/lib/api/domains/contacts";
import { useTagsSettingsTranslations } from "@/lib/i18n/generated/hooks";
import { createModalId, useModalDismiss } from "@/lib/modals";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useContactsSelectableListQuery } from "@/lib/query/hooks/useContacts";
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useSyncTagContactsByIdMutation,
  useTagMembersQuery,
  useUpdateTagByIdMutation,
} from "@/lib/query/hooks/useTags";
import { contactKeys } from "@/lib/query/keys";

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

function randomHexColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")}`;
}

interface OpenTagEditorModalOptions {
  initialLabel?: string;
  initialSelectedPersonIds?: string[];
  mode: "create" | "edit";
  onCreated: (tag: TagWithCount, selectedPersonIds: string[]) => void;
  onDeleted: (tagId: string) => void;
  onUpdated: (tag: TagWithCount, selectedPersonIds: string[]) => void;
  tag?: TagWithCount;
}

interface TagEditorModalBodyProps extends OpenTagEditorModalOptions {
  modalId: string;
}

function TagEditorModalBody({
  modalId,
  mode,
  tag,
  initialLabel,
  initialSelectedPersonIds = [],
  onCreated,
  onUpdated,
  onDeleted,
}: TagEditorModalBodyProps) {
  const t = useTagsSettingsTranslations();
  const queryClient = useQueryClient();
  const createTagMutation = useCreateTagMutation();
  const updateTagByIdMutation = useUpdateTagByIdMutation();
  const syncTagContactsMutation = useSyncTagContactsByIdMutation();
  const deleteTagMutation = useDeleteTagMutation();

  const { data: contactsData, isLoading: isLoadingContactsList } = useContactsSelectableListQuery({
    limit: 200,
  });
  const { data: tagMembers, isLoading: isLoadingMembers } = useTagMembersQuery(
    tag?.id ?? "",
    undefined,
    mode === "edit" && !!tag,
  );

  const form = useForm<{ label: string; color: string }>({
    initialValues: {
      color: tag?.color ?? randomHexColor(),
      label: initialLabel ?? tag?.label ?? "",
    },
    mode: "controlled",
    validate: schemaResolver(createTagSchema, { sync: true }),
  });

  const allContacts = contactsData?.contacts ?? [];
  const [selectedIds, setSelectedIds] = useState<string[]>(
    mode === "create" ? initialSelectedPersonIds : [],
  );
  const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>(
    mode === "create" ? initialSelectedPersonIds : [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (mode !== "edit" || !tagMembers) {
      return;
    }
    const ids = tagMembers.contacts.map((person) => person.id);
    setSelectedIds(ids);
    setInitialSelectedIds(ids);
  }, [mode, tagMembers]);

  const isLoadingContacts = isLoadingContactsList || (mode === "edit" && !!tag && isLoadingMembers);

  const isBlocking = isSubmitting || isLoadingContacts;
  const { closeModal, closeModalSync } = useModalDismiss(modalId, isBlocking);

  const handleSearch = useCallback(
    async (query: string): Promise<ContactSelectable[]> => {
      try {
        const params = { limit: 10, search: query };
        const data = await queryClient.fetchQuery({
          queryFn: () => getContactsSelectableList(params),
          queryKey: contactKeys.selectable.list(params),
        });
        return data.contacts ?? [];
      } catch {
        return [];
      }
    },
    [queryClient],
  );

  const buildPreviewContacts = (ids: string[]): ContactPreview[] => {
    const map = new Map(allContacts.map((contact) => [contact.id, contact]));
    return ids
      .map((id) => map.get(id))
      .filter((contact): contact is ContactSelectable => contact != null)
      .slice(0, 3)
      .map((contact) => ({
        avatar: contact.avatar,
        firstName: contact.firstName,
        id: contact.id,
        lastName: contact.lastName,
      }));
  };

  const syncMembers = async (tagId: string) => {
    const initial = new Set(initialSelectedIds);
    const current = new Set(selectedIds);

    const toAdd = selectedIds.filter((id) => !initial.has(id));
    const toRemove = initialSelectedIds.filter((id) => !current.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }

    await syncTagContactsMutation.mutateAsync({ tagId, toAdd, toRemove });
  };

  const handleSave = async (values: typeof form.values) => {
    if (submitLockRef.current || isSubmitting) {
      return;
    }

    const trimmedLabel = values.label.trim();
    const color = values.color.trim();
    if (!trimmedLabel || !color) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    const loadingId = notifications.show(
      loadingNotificationTemplate({
        description: t("SavingDescription"),
        title: t("SavingTitle"),
      }),
    );

    try {
      if (mode === "create") {
        const created = await createTagMutation.mutateAsync({ label: trimmedLabel });

        let isPatchSuccessful = true;
        try {
          await updateTagByIdMutation.mutateAsync({
            patch: { color, label: trimmedLabel },
            tagId: created.tag.id,
          });
        } catch {
          isPatchSuccessful = false;
        }

        notifications.hide(loadingId);
        captureEvent("tag_created");

        closeModalSync();
        notifications.show(
          successNotificationTemplate({
            description: t("CreateSuccessDescription"),
            title: t("CreateSuccessTitle"),
          }),
        );

        let areMembersSynced = selectedIds.length === 0;
        if (selectedIds.length > 0) {
          try {
            await syncTagContactsMutation.mutateAsync({
              tagId: created.tag.id,
              toAdd: selectedIds,
              toRemove: [],
            });
            areMembersSynced = true;
          } catch {
            areMembersSynced = false;
          }
        }

        if (!isPatchSuccessful || !areMembersSynced) {
          notifications.show(
            errorNotificationTemplate({
              description: t("SaveErrorDescription"),
              title: t("SaveErrorTitle"),
            }),
          );
        }

        try {
          onCreated(
            {
              ...created.tag,
              color: isPatchSuccessful ? color : created.tag.color,
              contactCount: areMembersSynced ? selectedIds.length : created.tag.contactCount,
              label: trimmedLabel,
              previewContacts: areMembersSynced
                ? buildPreviewContacts(selectedIds)
                : created.tag.previewContacts,
            },
            selectedIds,
          );
        } catch {
          // Keep persistence successful even if caller-side UI update throws.
        }
      } else if (tag) {
        await updateTagByIdMutation.mutateAsync({
          patch: { color, label: trimmedLabel },
          tagId: tag.id,
        });

        await syncMembers(tag.id);

        captureEvent("tag_updated");

        notifications.hide(loadingId);
        closeModalSync();
        notifications.show(
          successNotificationTemplate({
            description: t("SaveSuccessDescription"),
            title: t("SaveSuccessTitle"),
          }),
        );

        try {
          onUpdated(
            {
              ...tag,
              color,
              contactCount: selectedIds.length,
              label: trimmedLabel,
              previewContacts: buildPreviewContacts(selectedIds),
            },
            selectedIds,
          );
        } catch {
          // Keep persistence successful even if caller-side UI update throws.
        }
      }
    } catch {
      notifications.hide(loadingId);
      notifications.show(
        errorNotificationTemplate({
          description: t("SaveErrorDescription"),
          title: t("SaveErrorTitle"),
        }),
      );
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const requestDelete = () => {
    if (!tag) {
      return;
    }

    openStandardConfirmModal({
      cancelLabel: t("CancelButton"),
      confirmColor: "red",
      confirmLabel: t("DeleteConfirmButton"),
      message: <Text size="sm">{t("DeleteConfirmMessage", { label: tag.label })}</Text>,
      onConfirm: async () => {
        try {
          await deleteTagMutation.mutateAsync(tag.id);

          captureEvent("tag_deleted");

          closeModalSync();
          notifications.show(
            successNotificationTemplate({
              description: t("DeleteSuccessDescription"),
              title: t("DeleteSuccessTitle"),
            }),
          );
          onDeleted(tag.id);
        } catch {
          notifications.show(
            errorNotificationTemplate({
              description: t("DeleteErrorDescription"),
              title: t("DeleteErrorTitle"),
            }),
          );
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} stroke={1.5} />}
          isDangerous
          text={t("DeleteConfirmTitle")}
        />
      ),
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSave)}>
      <Stack gap="md">
        <Group align="flex-start" gap="md" grow>
          <ColorInput
            disabled={isBlocking}
            format="hex"
            label={t("ColorLabel")}
            placeholder="#A1B2C3"
            required
            swatches={COLOR_SWATCHES}
            swatchesPerRow={9}
            withAsterisk
            {...form.getInputProps("color")}
          />

          <TextInput
            data-autofocus
            disabled={isBlocking}
            label={t("LabelLabel")}
            placeholder={t("LabelPlaceholder")}
            required
            withAsterisk
            {...form.getInputProps("label")}
          />
        </Group>

        <Stack gap="xs">
          <Text fw={500} size="sm">
            {t("PeopleWithTagLabel")}
          </Text>
          {isLoadingContacts ? (
            <Center py="xs">
              <Loader size="sm" />
            </Center>
          ) : (
            <PeopleMultiPickerInput
              contacts={allContacts}
              disabled={isBlocking}
              noResultsLabel={t("NoPeopleFound")}
              onChange={setSelectedIds}
              onSearch={handleSearch}
              placeholder={t("AddFirstPersonPlaceholder")}
              searchDebounceMs={DEBOUNCE_MS.contactPicker}
              selectedIds={selectedIds}
            />
          )}
        </Stack>

        <ModalFooter
          actionDisabled={isSubmitting || !form.values.label.trim() || !form.values.color.trim()}
          actionLabel={mode === "create" ? t("CreateButton") : t("SaveButton")}
          actionLeftSection={mode === "create" ? <IconTagPlus size={16} /> : undefined}
          actionLoading={isSubmitting}
          actionType="submit"
          cancelDisabled={isSubmitting}
          cancelLabel={t("CancelButton")}
          dangerDisabled={isSubmitting}
          dangerLabel={mode === "edit" ? t("DeleteButton") : undefined}
          onCancel={closeModal}
          onDanger={mode === "edit" ? requestDelete : undefined}
        />
      </Stack>
    </form>
  );
}

function TagEditorModalTitle({ mode }: { mode: "create" | "edit" }) {
  const t = useTagsSettingsTranslations();
  return (
    <ModalTitle
      icon={
        mode === "create" ? (
          <IconTagPlus size={20} stroke={1.5} />
        ) : (
          <IconTag size={20} stroke={1.5} />
        )
      }
      text={mode === "edit" ? t("EditTitle") : t("CreateTitle")}
    />
  );
}

export function openTagEditorModal(options: OpenTagEditorModalOptions) {
  const modalId = createModalId("tag-editor");

  modals.open({
    centered: true,
    children: <TagEditorModalBody modalId={modalId} {...options} />,
    modalId,
    size: "md",
    title: <TagEditorModalTitle mode={options.mode} />,
  });
}
