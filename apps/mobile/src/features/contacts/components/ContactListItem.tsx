import type { Contact } from "@bondery/schemas";
import { memo, useCallback } from "react";
import type { SwipeAction } from "../../../lib/preferences/useMobilePreferences";
import {
  useContactIsSelected,
  useContactsSelection,
  useContactsSelectionMode,
} from "../contactsSelectionStore";
import { ContactRow } from "./ContactRow";

interface ContactListItemProps {
  contact: Contact;
  isMyselfRow: boolean;
  isSwipeEnabled?: boolean;
  leftSwipeAction: SwipeAction;
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onOpenContact: (contactId: string) => void;
  onOpenMyself: () => void;
  rightSwipeAction: SwipeAction;
  texts: {
    call: string;
    message: string;
    email: string;
  };
}

function ContactListItemComponent({
  contact,
  isMyselfRow,
  isSwipeEnabled = true,
  leftSwipeAction,
  rightSwipeAction,
  texts,
  onExecuteAction,
  onOpenContact,
  onOpenMyself,
}: ContactListItemProps) {
  const selected = useContactIsSelected(contact.id);
  const selectionMode = useContactsSelectionMode();
  const toggleContact = useContactsSelection((state) => state.toggleContact);
  const enterSelectionSession = useContactsSelection((state) => state.enterSelectionSession);

  const handlePress = useCallback(
    (contactId: string) => {
      if (isMyselfRow) {
        onOpenMyself();
        return;
      }

      onOpenContact(contactId);
    },
    [isMyselfRow, onOpenContact, onOpenMyself],
  );

  return (
    <ContactRow
      contact={contact}
      isDisabled={isMyselfRow}
      isSwipeEnabled={isSwipeEnabled && !isMyselfRow}
      leftSwipeAction={leftSwipeAction}
      onEnterSelection={enterSelectionSession}
      onExecuteAction={onExecuteAction}
      onPress={handlePress}
      onToggleSelect={toggleContact}
      rightSwipeAction={rightSwipeAction}
      selected={selected}
      selectionMode={selectionMode}
      texts={texts}
    />
  );
}

function areContactListItemPropsEqual(
  previous: ContactListItemProps,
  next: ContactListItemProps,
): boolean {
  return (
    previous.contact.id === next.contact.id &&
    previous.contact.firstName === next.contact.firstName &&
    previous.contact.middleName === next.contact.middleName &&
    previous.contact.lastName === next.contact.lastName &&
    previous.contact.updatedAt === next.contact.updatedAt &&
    previous.contact.avatar === next.contact.avatar &&
    previous.isMyselfRow === next.isMyselfRow &&
    previous.isSwipeEnabled === next.isSwipeEnabled &&
    previous.leftSwipeAction === next.leftSwipeAction &&
    previous.rightSwipeAction === next.rightSwipeAction &&
    previous.texts === next.texts &&
    previous.onExecuteAction === next.onExecuteAction &&
    previous.onOpenContact === next.onOpenContact &&
    previous.onOpenMyself === next.onOpenMyself
  );
}

export const ContactListItem = memo(ContactListItemComponent, areContactListItemPropsEqual);
