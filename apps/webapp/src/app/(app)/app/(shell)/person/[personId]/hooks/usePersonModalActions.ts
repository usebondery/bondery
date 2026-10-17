"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, ContactSelectable } from "@bondery/schemas";
import { useRouter } from "next/navigation";
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

  const openDeleteModal = () =>
    openDeleteContactModal({
      contactId: personId,
      contactName: resolvedContact ? formatContactName(resolvedContact) : personId,
      onDeleted: async () => {
        router.push(WEBAPP_ROUTES.PEOPLE);
      },
    });

  const openMergeWithModalForCurrentPerson = () => {
    openMergeWithModal({
      contacts: resolvedContact ? [resolvedContact] : [],
      contactsHasMore,
      disableLeftPicker: true,
      leftPersonId: resolvedContact?.id ?? personId,
      onSearch: searchContactsPage,
      people: selectableContacts,
    });
  };

  const openShareModal = () => {
    if (!contact) {
      return;
    }
    openShareContactModal({ contact });
  };

  const openAddToGroupsModal = () => {
    openAddPeopleToGroupSelectionModal({
      personIds: [personId],
    });
  };

  return {
    openAddToGroupsModal,
    openDeleteModal,
    openMergeWithModalForCurrentPerson,
    openShareModal,
  };
}
