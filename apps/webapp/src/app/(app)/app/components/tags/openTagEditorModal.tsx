"use client";

import {
  Center,
  ColorInput,
  DEFAULT_THEME,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Button,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { flushSync } from "react-dom";
import { IconTag, IconTagMinus, IconTagPlus, IconTrash } from "@tabler/icons-react";
import { createTagSchema, type Contact, type ContactPreview, type TagWithCount } from "@bondery/schemas";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEBOUNCE_MS } from "@/lib/config";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { captureEvent } from "@/lib/analytics/client";
import { useContactsListQuery } from "@/lib/query/hooks/useContacts";
import {
  useCreateTagMutation,
  useDeleteTagMutation,
  useSyncTagContactsByIdMutation,
  useTagMembersQuery,
  useUpdateTagByIdMutation,
} from "@/lib/query/hooks/useTags";
import { createContactsListQueryFn } from "@/lib/query/fetchers/contacts";
import { contactKeys } from "@/lib/query/keys";
import { createModalId, useModalBlocking } from "@/lib/modals";

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

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

interface OpenTagEditorModalOptions {
  t: TranslateFn;
  mode: "create" | "edit";
  tag?: TagWithCount;
  initialLabel?: string;
  initialSelectedPersonIds?: string[];
  onCreated: (tag: TagWithCount, selectedPersonIds: string[]) => void;
  onUpdated: (tag: TagWithCount, selectedPersonIds: string[]) => void;
  onDeleted: (tagId: string) => void;
}

interface TagEditorModalBodyProps extends OpenTagEditorModalOptions {
  modalId: string;
}

function TagEditorModalBody({
  modalId,
  t,
  mode,
  tag,
  initialLabel,
  initialSelectedPersonIds = [],
  onCreated,
  onUpdated,
  onDeleted,
}: TagEditorModalBodyProps) {
  const queryClient = useQueryClient();
  const createTagMutation = useCreateTagMutation();
  const updateTagByIdMutation = useUpdateTagByIdMutation();
  const syncTagContactsMutation = useSyncTagContactsByIdMutation();
  const deleteTagMutation = useDeleteTagMutation();

  const { data: contactsData, isLoading: isLoadingContactsList } = useContactsListQuery({
    limit: 200,
  });
  const { data: tagMembers, isLoading: isLoadingMembers } = useTagMembersQuery(
    tag?.id ?? "",
    undefined,
    mode === "edit" && !!tag,
  );

  const form = useForm<{ label: string; color: string }>({
    mode: "controlled",
    initialValues: {
      label: initialLabel ?? tag?.label ?? "",
      color: tag?.color ?? randomHexColor(),
    },
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
    if (mode !== "edit" || !tagMembers) return;
    const ids = tagMembers.contacts.map((person) => person.id);
    setSelectedIds(ids);
    setInitialSelectedIds(ids);
  }, [mode, tagMembers]);

  const isLoadingContacts =
    isLoadingContactsList || (mode === "edit" && !!tag && isLoadingMembers);

  const isBlocking = isSubmitting || isLoadingContacts;
  useModalBlocking(modalId, isBlocking);

  const handleSearch = useCallback(
    async (query: string): Promise<Contact[]> => {
      try {
        const params = { search: query, limit: 10 };
        const data = await queryClient.fetchQuery({
          queryKey: contactKeys.list(params),
          queryFn: createContactsListQueryFn(params),
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
      .filter(Boolean)
      .slice(0, 3)
      .map((contact) => ({
        id: contact!.id,
        firstName: contact!.firstName,
        lastName: contact!.lastName,
        avatar: contact!.avatar,
      }));
  };

  const syncMembers = async (tagId: string) => {
    const initial = new Set(initialSelectedIds);
    const current = new Set(selectedIds);

    const toAdd = selectedIds.filter((id) => !initial.has(id));
    const toRemove = initialSelectedIds.filter((id) => !current.has(id));

    if (toAdd.length === 0 && toRemove.length === 0) return;

    await syncTagContactsMutation.mutateAsync({ tagId, toAdd, toRemove });
  };

  const handleSave = async (values: typeof form.values) => {
    if (submitLockRef.current || isSubmitting) return;

    const trimmedLabel = values.label.trim();
    const color = values.color.trim();
    if (!trimmedLabel || !color) return;

    submitLockRef.current = true;
    setIsSubmitting(true);

    const loadingId = notifications.show(
      loadingNotificationTemplate({
        title: t("SavingTitle"),
        description: t("SavingDescription"),
      }),
    );

    try {
      if (mode === "create") {
        const created = await createTagMutation.mutateAsync({ label: trimmedLabel });

        let isPatchSuccessful = true;
        try {
          await updateTagByIdMutation.mutateAsync({
            tagId: created.tag.id,
            patch: { label: trimmedLabel, color },
          });
        } catch {
          isPatchSuccessful = false;
        }

        let areMembersSynced = true;
        if (selectedIds.length > 0) {
          try {
            await syncTagContactsMutation.mutateAsync({
              tagId: created.tag.id,
              toAdd: selectedIds,
              toRemove: [],
            });
          } catch {
            areMembersSynced = false;
          }
        }

        notifications.hide(loadingId);
        captureEvent("tag_created");

        flushSync(() => modals.close(modalId));
        notifications.show(
          successNotificationTemplate({
            title: t("CreateSuccessTitle"),
            description: t("CreateSuccessDescription"),
          }),
        );

        if (!isPatchSuccessful || !areMembersSynced) {
          notifications.show(
            errorNotificationTemplate({
              title: t("SaveErrorTitle"),
              description: t("SaveErrorDescription"),
            }),
          );
        }

        try {
          onCreated(
            {
              ...created.tag,
              label: trimmedLabel,
              color: isPatchSuccessful ? color : created.tag.color,
              contactCount: areMembersSynced ? selectedIds.length : created.tag.contactCount,
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
          tagId: tag.id,
          patch: { label: trimmedLabel, color },
        });

        await syncMembers(tag.id);

        captureEvent("tag_updated");

        notifications.hide(loadingId);
        flushSync(() => modals.close(modalId));
        notifications.show(
          successNotificationTemplate({
            title: t("SaveSuccessTitle"),
            description: t("SaveSuccessDescription"),
          }),
        );

        try {
          onUpdated(
            {
              ...tag,
              label: trimmedLabel,
              color,
              contactCount: selectedIds.length,
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
          title: t("SaveErrorTitle"),
          description: t("SaveErrorDescription"),
        }),
      );
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const requestDelete = () => {
    if (!tag) return;

    openStandardConfirmModal({
      title: (
        <ModalTitle
          text={t("DeleteConfirmTitle")}
          icon={<IconTrash size={20} stroke={1.5} />}
          isDangerous
        />
      ),
      message: <Text size="sm">{t("DeleteConfirmMessage", { label: tag.label })}</Text>,
      confirmLabel: t("DeleteConfirmButton"),
      cancelLabel: t("CancelButton"),
      confirmColor: "red",
      onConfirm: async () => {
        try {
          await deleteTagMutation.mutateAsync(tag.id);

          captureEvent("tag_deleted");

          flushSync(() => modals.close(modalId));
          notifications.show(
            successNotificationTemplate({
              title: t("DeleteSuccessTitle"),
              description: t("DeleteSuccessDescription"),
            }),
          );
          onDeleted(tag.id);
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: t("DeleteErrorTitle"),
              description: t("DeleteErrorDescription"),
            }),
          );
        }
      },
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSave)}>
      <Stack gap="md">
        <Group gap="md" grow align="flex-start">
          <ColorInput
            label={t("ColorLabel")}
            withAsterisk
            required
            swatches={COLOR_SWATCHES}
            swatchesPerRow={9}
            format="hex"
            placeholder="#A1B2C3"
            {...form.getInputProps("color")}
          />

          <TextInput
            label={t("LabelLabel")}
            withAsterisk
            required
            placeholder={t("LabelPlaceholder")}
            data-autofocus
            {...form.getInputProps("label")}
          />
        </Group>

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {t("PeopleWithTagLabel")}
          </Text>
          {isLoadingContacts ? (
            <Center py="xs">
              <Loader size="sm" />
            </Center>
          ) : (
            <PeopleMultiPickerInput
              contacts={allContacts}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              placeholder={t("AddFirstPersonPlaceholder")}
              noResultsLabel={t("NoPeopleFound")}
              onSearch={handleSearch}
              searchDebounceMs={DEBOUNCE_MS.contactPicker}
              disabled={isSubmitting}
            />
          )}
        </Stack>

        <Group justify="space-between" mt="md">
          {mode === "edit" ? (
            <Button
              variant="light"
              color="red"
              leftSection={<IconTagMinus size={16} />}
              onClick={requestDelete}
              disabled={isSubmitting}
            >
              {t("DeleteButton")}
            </Button>
          ) : (
            <span />
          )}

          <ModalFooter
            cancelLabel={t("CancelButton")}
            onCancel={() => modals.close(modalId)}
            cancelDisabled={isSubmitting}
            actionLabel={mode === "create" ? t("CreateButton") : t("SaveButton")}
            actionLeftSection={mode === "create" ? <IconTagPlus size={16} /> : undefined}
            actionLoading={isSubmitting}
            actionDisabled={isSubmitting || !form.values.label.trim() || !form.values.color.trim()}
            actionType="submit"
          />
        </Group>
      </Stack>
    </form>
  );
}

export function openTagEditorModal(options: OpenTagEditorModalOptions) {
  const modalId = createModalId("tag-editor");

  modals.open({
    modalId,
    title: (
      <ModalTitle
        text={options.mode === "edit" ? options.t("EditTitle") : options.t("CreateTitle")}
        icon={
          options.mode === "create" ? (
            <IconTagPlus size={20} stroke={1.5} />
          ) : (
            <IconTag size={20} stroke={1.5} />
          )
        }
      />
    ),
    size: "lg",
    centered: true,
    children: <TagEditorModalBody modalId={modalId} {...options} />,
  });
}
