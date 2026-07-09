"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { openDeleteContactModal } from "@/components/contacts/openDeleteContactModal";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { openAddPeopleToGroupSelectionModal } from "../../../people/components/modals/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "../../../people/components/modals/MergeWithModal";
import { openShareContactModal } from "../../../people/components/modals/ShareContactModal";

interface UsePersonModalActionsOptions {
  contact: Contact | null;
  personId: string;
  resolvedContact: Contact | undefined;
  selectableContacts: Contact[];
}

export function usePersonModalActions({
  contact,
  personId,
  resolvedContact,
  selectableContacts,
}: UsePersonModalActionsOptions) {
  const router = useRouter();

  const openDeleteModal = useCallback(
    () =>
      openDeleteContactModal({
        contactId: personId,
        contactName: resolvedContact ? formatContactName(resolvedContact) : personId,
        onDeleted: async () => {
          router.push(WEBAPP_ROUTES.PEOPLE);
        },
      }),
    [personId, resolvedContact, router],
  );

  const openMergeWithModalForCurrentPerson = useCallback(() => {
    const mergeContacts = [resolvedContact, ...selectableContacts].reduce<Contact[]>(
      (acc, item) => {
        if (!item) {
          return acc;
        }
        if (!acc.some((existing) => existing.id === item.id)) {
          acc.push(item);
        }
        return acc;
      },
      [],
    );

    openMergeWithModal({
      contacts: mergeContacts,
      disableLeftPicker: true,
      leftPersonId: resolvedContact?.id ?? personId,
      onSearch: searchContacts,
    });
  }, [personId, resolvedContact, selectableContacts]);

  const openShareModal = useCallback(() => {
    if (!contact) {
      return;
    }
    openShareContactModal({ contact });
  }, [contact]);

  const openAddToGroupsModal = useCallback(() => {
    openAddPeopleToGroupSelectionModal({
      personIds: [personId],
    });
  }, [personId]);

  return {
    openAddToGroupsModal,
    openDeleteModal,
    openMergeWithModalForCurrentPerson,
    openShareModal,
  };
}
