import { memo, useCallback } from "react";
import type { Contact } from "@bondery/schemas";
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
  rightSwipeAction: SwipeAction;
  texts: {
    call: string;
    message: string;
    email: string;
  };
  onExecuteAction: (contact: Contact, action: SwipeAction) => void;
  onOpenContact: (contactId: string) => void;
  onOpenMyself: () => void;
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
      selected={selected}
      selectionMode={selectionMode}
      isDisabled={isMyselfRow}
      isSwipeEnabled={isSwipeEnabled && !isMyselfRow}
      leftSwipeAction={leftSwipeAction}
      rightSwipeAction={rightSwipeAction}
      texts={texts}
      onToggleSelect={toggleContact}
      onEnterSelection={enterSelectionSession}
      onExecuteAction={onExecuteAction}
      onPress={handlePress}
    />
  );
}

function areContactListItemPropsEqual(
  previous: ContactListItemProps,
  next: ContactListItemProps,
): boolean {
  return (
    previous.contact.id === next.contact.id &&
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
