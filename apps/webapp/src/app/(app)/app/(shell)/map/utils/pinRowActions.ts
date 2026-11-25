"use client";

import type { Contact } from "@bondery/schemas";
import { openNewActivityModal } from "@/app/(app)/app/(shell)/interactions/components/openNewActivityModal";
import { openAddPeopleToGroupSelectionModal } from "@/app/(app)/app/(shell)/people/components/modals/openAddPeopleToGroupSelectionModal";
import type { ContactTableRow } from "@/components/contacts/ContactsTableV2";

interface PinRowActionsOptions {
  /** Rows the table shows right now; passed to the interaction modal as participants. */
  contacts: Contact[] | ContactTableRow[];
  onDeleteOne: (contactId: string) => void;
  onDeleteSelected: (contactIds: string[]) => void;
  onMergeOne: (contactId: string) => void;
  onMergeSelected: (leftContactId: string, rightContactId?: string) => void;
}

/** Standard row actions shared by the locations and addresses tables. */
export function buildPinRowActions({
  contacts,
  onDeleteOne,
  onDeleteSelected,
  onMergeOne,
  onMergeSelected,
}: PinRowActionsOptions) {
  return {
    onAddToGroupsOne: (contactId: string) =>
      openAddPeopleToGroupSelectionModal({ personIds: [contactId] }),
    onAddToGroupsSelected: (contactIds: string[]) =>
      openAddPeopleToGroupSelectionModal({ personIds: contactIds }),
    onCreateInteractionSelected: (contactIds: string[]) => {
      openNewActivityModal({
        contacts: contacts as Contact[],
        initialParticipantIds: contactIds,
      });
    },
    onDeleteOne,
    onDeleteSelected,
    onMergeOne,
    onMergeSelected: (leftContactId: string, rightContactId?: string) =>
      onMergeSelected(leftContactId, rightContactId),
  };
}
