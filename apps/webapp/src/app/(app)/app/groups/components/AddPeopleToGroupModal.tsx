"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Stack, Text, Loader, Center } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  PeopleMultiPickerInput,
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../actions";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import { DEBOUNCE_MS } from "@/lib/config";
import { searchContacts } from "@/lib/searchContacts";

interface AddPeopleToGroupModalProps {
  groupId: string;
  groupLabel: string;
}

interface AddPeopleToGroupFormProps extends AddPeopleToGroupModalProps {
  modalId: string;
}

function AddPeopleToGroupModalTitle({ groupLabel }: { groupLabel: string }) {
  const t = useTranslations("GroupsPage");
  return (
    <ModalTitle
      text={t("AddPeopleModal.Title", { groupLabel })}
      icon={<IconUserPlus size={24} />}
    />
  );
}

/**
 * Opens a modal that lets user select and add contacts to the provided group.
 */
export function openAddPeopleToGroupModal(props: AddPeopleToGroupModalProps) {
  const modalId = `add-people-to-group-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title: <AddPeopleToGroupModalTitle groupLabel={props.groupLabel} />,
    trapFocus: true,
    size: "md",
    children: <AddPeopleToGroupForm {...props} modalId={modalId} />,
  });
}

function AddPeopleToGroupForm({ groupId, groupLabel, modalId }: AddPeopleToGroupFormProps) {
  const router = useRouter();
  const t = useTranslations("GroupsPage");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const existingMemberIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    modals.updateModal({
      modalId,
      closeOnEscape: !isSubmitting,
      closeOnClickOutside: !isSubmitting,
      withCloseButton: !isSubmitting,
    });
  }, [isSubmitting, modalId]);

  useEffect(() => {
    async function fetchAvailableContacts() {
      try {
        const [allContactsRes, groupContactsRes] = await Promise.all([
          fetch(`${API_ROUTES.CONTACTS}?limit=200&${buildAvatarQueryString("small")}`),
          fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts?${buildAvatarQueryString("small")}`),
        ]);

        if (!allContactsRes.ok || !groupContactsRes.ok) {
          throw new Error("Failed to fetch contacts");
        }

        const allContactsData = (await allContactsRes.json()) as { contacts: Contact[] };
        const groupContactsData = (await groupContactsRes.json()) as { contacts: Contact[] };

        const existingIds = new Set(groupContactsData.contacts.map((contact) => contact.id));
        existingMemberIdsRef.current = existingIds;
        setContacts(allContactsData.contacts.filter((contact) => !existingIds.has(contact.id)));
      } catch (error) {
        notifications.show(
          errorNotificationTemplate({
            title: t("AddPeopleModal.ErrorTitle"),
            description: t("AddPeopleModal.LoadError"),
          }),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvailableContacts();
  }, [groupId]);

  const handleSearch = useCallback(async (query: string): Promise<Contact[]> => {
    const results = await searchContacts(query);
    return results.filter((c) => !existingMemberIdsRef.current.has(c.id));
  }, []);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      notifications.show({
        title: t("AddPeopleModal.NoSelectionTitle"),
        message: t("AddPeopleModal.NoSelectionDescription"),
        color: "yellow",
      });
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("AddPeopleModal.AddingTitle"),
        description: t("AddPeopleModal.AddingDescription"),
      }),
    });

    try {
      const res = await fetch(`${API_ROUTES.GROUPS}/${groupId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personIds: selectedIds,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t("AddPeopleModal.AddError"));
      }

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: t("AddPeopleModal.SuccessTitle"),
          description:
            selectedIds.length === 1
              ? t("AddPeopleModal.SuccessMessageSingular", { groupLabel })
              : t("AddPeopleModal.SuccessMessagePlural", { count: selectedIds.length, groupLabel }),
        }),
      );

      modals.close(modalId);
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: t("AddPeopleModal.ErrorTitle"),
          description: error instanceof Error ? error.message : t("AddPeopleModal.AddError"),
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
          {t("AddPeopleModal.EmptyState")}
        </Text>
        <ModalFooter
          cancelLabel={t("AddPeopleModal.Close")}
          onCancel={() => modals.close(modalId)}
        />
      </Stack>
    );
  }

  const actionLabel =
    selectedIds.length === 0
      ? t("AddPeopleModal.ActionDefault")
      : selectedIds.length === 1
        ? t("AddPeopleModal.ActionSingular")
        : t("AddPeopleModal.ActionPlural", { count: selectedIds.length });

  return (
    <Stack gap="md">
      <PeopleMultiPickerInput
        contacts={contacts}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        placeholder={t("AddPeopleModal.AddContactsPlaceholder")}
        noResultsLabel={t("AddPeopleModal.NoContactsFound")}
        onSearch={handleSearch}
        searchDebounceMs={DEBOUNCE_MS.contactPicker}
        disabled={isSubmitting}
      />

      <ModalFooter
        cancelLabel={t("AddPeopleModal.Cancel")}
        onCancel={() => modals.close(modalId)}
        cancelDisabled={isSubmitting}
        actionLabel={actionLabel}
        onAction={() => {
          void handleSubmit();
        }}
        actionLoading={isSubmitting}
        actionDisabled={selectedIds.length === 0 || isSubmitting}
        actionLeftSection={<IconUserPlus size={16} />}
      />
    </Stack>
  );
}
