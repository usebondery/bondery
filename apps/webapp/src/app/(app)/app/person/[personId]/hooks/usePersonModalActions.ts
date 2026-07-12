"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, ContactSelectable } from "@bondery/schemas";
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
  selectableContacts: ContactSelectable[];
}

export function usePersonModalActions({
  contact,
  personId,
  resolvedContact,
  selectableContacts: _selectableContacts,
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
    openMergeWithModal({
      contacts: resolvedContact ? [resolvedContact] : [],
      disableLeftPicker: true,
      leftPersonId: resolvedContact?.id ?? personId,
      onSearch: searchContacts,
    });
  }, [personId, resolvedContact]);

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
