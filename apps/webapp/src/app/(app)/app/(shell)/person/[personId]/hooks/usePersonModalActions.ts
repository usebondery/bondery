"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, ContactSelectable } from "@bondery/schemas";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { openDeleteContactModal } from "@/components/contacts/openDeleteContactModal";
import { searchContactsPage } from "@/lib/contacts/searchContacts";
import { openAddPeopleToGroupSelectionModal } from "../../../people/components/modals/AddPeopleToGroupSelectionModal";
import { openMergeWithModal } from "../../../people/components/modals/MergeWithModal";
import { openShareContactModal } from "../../../people/components/modals/ShareContactModal";

interface UsePersonModalActionsOptions {
  contact: Contact | null;
  contactsHasMore?: boolean;
  personId: string;
  resolvedContact: Contact | undefined;
  selectableContacts: ContactSelectable[];
}

export function usePersonModalActions({
  contact,
  contactsHasMore = false,
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
    openMergeWithModal({
      contacts: resolvedContact ? [resolvedContact] : [],
      contactsHasMore,
      disableLeftPicker: true,
      leftPersonId: resolvedContact?.id ?? personId,
      onSearch: searchContactsPage,
      people: selectableContacts,
    });
  }, [contactsHasMore, personId, resolvedContact, selectableContacts]);

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
