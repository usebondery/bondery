"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Stack, Text, Loader, Center } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUserPlus } from "@tabler/icons-react";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalFooter,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { revalidateGroups } from "../../actions";
import { PeopleMultiPickerInput } from "../../components/shared/PeopleMultiPickerInput";

export interface AddPeopleToGroupModalTexts {
  title: string;
  errorTitle: string;
  successTitle: string;
  loadError: string;
  noSelectionTitle: string;
  noSelectionDescription: string;
  addingTitle: string;
  addingDescription: string;
  addError: string;
  emptyState: string;
  close: string;
  cancel: string;
  addContactsPlaceholder: string;
  noContactsFound: string;
  formatActionLabel(count: number): string;
  formatSuccessMessage(count: number, groupLabel: string): string;
}

interface AddPeopleToGroupModalProps {
  groupId: string;
  groupLabel: string;
  texts: AddPeopleToGroupModalTexts;
}

interface AddPeopleToGroupFormProps extends AddPeopleToGroupModalProps {
  modalId: string;
}

interface AddPeopleToGroupModalTitleProps {
  title: string;
}

function AddPeopleToGroupModalTitle({ title }: AddPeopleToGroupModalTitleProps) {
  return <ModalTitle text={title} icon={<IconUserPlus size={24} />} />;
}

/**
 * Opens a modal that lets user select and add contacts to the provided group.
 */
export function openAddPeopleToGroupModal(props: AddPeopleToGroupModalProps) {
  const modalId = `add-people-to-group-${Math.random().toString(36).slice(2)}`;

  modals.open({
    modalId,
    title: <AddPeopleToGroupModalTitle title={props.texts.title} />,
    trapFocus: true,
    size: "md",
    children: <AddPeopleToGroupForm {...props} modalId={modalId} />,
  });
}

function AddPeopleToGroupForm({ groupId, groupLabel, modalId, texts }: AddPeopleToGroupFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
            title: texts.errorTitle,
            description: texts.loadError,
          }),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchAvailableContacts();
  }, [groupId, texts.errorTitle, texts.loadError]);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      notifications.show({
        title: texts.noSelectionTitle,
        message: texts.noSelectionDescription,
        color: "yellow",
      });
      return;
    }

    setIsSubmitting(true);

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: texts.addingTitle,
        description: texts.addingDescription,
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
        throw new Error(errorData.error || texts.addError);
      }

      notifications.hide(loadingNotification);

      notifications.show(
        successNotificationTemplate({
          title: texts.successTitle,
          description: texts.formatSuccessMessage(selectedIds.length, groupLabel),
        }),
      );

      modals.close(modalId);
      await revalidateGroups();
      router.refresh();
    } catch (error) {
      notifications.hide(loadingNotification);

      notifications.show(
        errorNotificationTemplate({
          title: texts.errorTitle,
          description: error instanceof Error ? error.message : texts.addError,
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
          {texts.emptyState}
        </Text>
        <ModalFooter cancelLabel={texts.close} onCancel={() => modals.close(modalId)} />
      </Stack>
    );
  }

  const actionLabel = texts.formatActionLabel(selectedIds.length);

  return (
    <Stack gap="md">
      <PeopleMultiPickerInput
        contacts={contacts}
        selectedIds={selectedIds}
        onChange={setSelectedIds}
        placeholder={texts.addContactsPlaceholder}
        noResultsLabel={texts.noContactsFound}
        disabled={isSubmitting}
      />

      <ModalFooter
        cancelLabel={texts.cancel}
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
