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
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconTag, IconTrash } from "@tabler/icons-react";
import type { Contact, ContactPreview, TagWithCount } from "@bondery/types";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  PeopleMultiPickerInput,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";

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
  const [label, setLabel] = useState(initialLabel ?? tag?.label ?? "");
  const [color, setColor] = useState(tag?.color ?? randomHexColor());
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    mode === "create" ? initialSelectedPersonIds : [],
  );
  const [initialSelectedIds, setInitialSelectedIds] = useState<string[]>(
    mode === "create" ? initialSelectedPersonIds : [],
  );
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const contactsResponse = await fetch(`${API_URL}${API_ROUTES.CONTACTS}`, {
          credentials: "include",
        });

        if (!contactsResponse.ok) throw new Error("contacts");

        const contactsData = (await contactsResponse.json()) as { contacts?: Contact[] };
        if (!isMounted) return;
        setAllContacts(contactsData.contacts || []);

        if (mode === "edit" && tag) {
          const membersResponse = await fetch(`${API_URL}${API_ROUTES.TAGS}/${tag.id}/contacts`, {
            credentials: "include",
          });

          if (!membersResponse.ok) throw new Error("members");

          const membersData = (await membersResponse.json()) as { contacts?: ContactPreview[] };
          const ids = (membersData.contacts || []).map((person) => person.id);
          if (!isMounted) return;
          setSelectedIds(ids);
          setInitialSelectedIds(ids);
        }
      } catch {
        if (!isMounted) return;
        notifications.show(
          errorNotificationTemplate({
            title: t("LoadContactsErrorTitle"),
            description: t("LoadContactsErrorDescription"),
          }),
        );
      } finally {
        if (!isMounted) return;
        setIsLoadingContacts(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [mode, tag, t]);

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

    if (toAdd.length > 0) {
      const addRes = await fetch(`${API_URL}${API_ROUTES.TAGS}/${tagId}/contacts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: toAdd }),
      });
      if (!addRes.ok) throw new Error("add");
    }

    if (toRemove.length > 0) {
      const removeRes = await fetch(`${API_URL}${API_ROUTES.TAGS}/${tagId}/contacts`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personIds: toRemove }),
      });
      if (!removeRes.ok) throw new Error("remove");
    }
  };

  const handleSave = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel || !color.trim()) return;

    setIsSubmitting(true);

    const loadingId = notifications.show(
      loadingNotificationTemplate({
        title: t("SavingTitle"),
        description: t("SavingDescription"),
      }),
    );

    try {
      if (mode === "create") {
        const createRes = await fetch(`${API_URL}${API_ROUTES.TAGS}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: trimmedLabel }),
        });
        if (!createRes.ok) throw new Error("create");

        const created = (await createRes.json()) as { tag: TagWithCount };

        const patchRes = await fetch(`${API_URL}${API_ROUTES.TAGS}/${created.tag.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: trimmedLabel, color }),
        });
        if (!patchRes.ok) throw new Error("patch");

        if (selectedIds.length > 0) {
          const addRes = await fetch(`${API_URL}${API_ROUTES.TAGS}/${created.tag.id}/contacts`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personIds: selectedIds }),
          });
          if (!addRes.ok) throw new Error("members");
        }

        onCreated(
          {
            ...created.tag,
            label: trimmedLabel,
            color,
            contactCount: selectedIds.length,
            previewContacts: buildPreviewContacts(selectedIds),
          },
          selectedIds,
        );
      } else if (tag) {
        const updateRes = await fetch(`${API_URL}${API_ROUTES.TAGS}/${tag.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: trimmedLabel, color }),
        });
        if (!updateRes.ok) throw new Error("update");

        await syncMembers(tag.id);

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
      }

      notifications.hide(loadingId);
      notifications.show(
        successNotificationTemplate({
          title: mode === "create" ? t("CreateSuccessTitle") : t("SaveSuccessTitle"),
          description:
            mode === "create" ? t("CreateSuccessDescription") : t("SaveSuccessDescription"),
        }),
      );

      modals.close(modalId);
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
          const response = await fetch(`${API_URL}${API_ROUTES.TAGS}/${tag.id}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (!response.ok) {
            notifications.show(
              errorNotificationTemplate({
                title: t("DeleteErrorTitle"),
                description: t("DeleteErrorDescription"),
              }),
            );
            return;
          }

          onDeleted(tag.id);
          notifications.show(
            successNotificationTemplate({
              title: t("DeleteSuccessTitle"),
              description: t("DeleteSuccessDescription"),
            }),
          );
          modals.close(modalId);
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
    <Stack gap="md">
      <Group gap="md" grow align="flex-start">
        <ColorInput
          label={t("ColorLabel")}
          withAsterisk
          required
          value={color}
          onChange={setColor}
          swatches={COLOR_SWATCHES}
          swatchesPerRow={9}
          format="hex"
          placeholder="#A1B2C3"
        />

        <TextInput
          label={t("LabelLabel")}
          withAsterisk
          required
          value={label}
          onChange={(event) => setLabel(event.currentTarget.value)}
          placeholder={t("LabelPlaceholder")}
          data-autofocus
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
            disabled={isSubmitting}
          />
        )}
      </Stack>

      <Group justify="space-between" mt="md">
        {mode === "edit" ? (
          <Button
            variant="light"
            color="red"
            leftSection={<IconTrash size={16} />}
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
          actionLoading={isSubmitting}
          actionDisabled={isSubmitting || !label.trim() || !color.trim()}
          onAction={() => {
            void handleSave();
          }}
        />
      </Group>
    </Stack>
  );
}

export function openTagEditorModal(options: OpenTagEditorModalOptions) {
  const modalId = `tag-editor-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title: (
      <ModalTitle
        text={options.mode === "edit" ? options.t("EditTitle") : options.t("CreateTitle")}
        icon={<IconTag size={20} stroke={1.5} />}
      />
    ),
    size: "lg",
    centered: true,
    children: <TagEditorModalBody modalId={modalId} {...options} />,
  });
}
