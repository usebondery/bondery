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

export function ContactListItem({
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

  function handlePress(contactId: string) {
    if (isMyselfRow) {
      onOpenMyself();
      return;
    }

    onOpenContact(contactId);
  }

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
