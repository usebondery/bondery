import type { ReactNode } from "react";
import { useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { TabRootLargeTitle, TabRootScreenHeader } from "../../../components/chrome";
import { useContactsSelectionMode } from "../contactsSelectionStore";
import { ContactsSelectionHeader } from "./ContactsSelectionHeader";

interface ContactsScreenHeaderProps {
  accessory: ReactNode;
}

export function ContactsScreenHeader({ accessory }: ContactsScreenHeaderProps) {
  const tMobileContacts = useMobileContactsTranslations();
  const selectionMode = useContactsSelectionMode();

  return (
    <TabRootScreenHeader
      accessory={accessory}
      titleRow={
        selectionMode ? (
          <ContactsSelectionHeader />
        ) : (
          <TabRootLargeTitle>{tMobileContacts("Title")}</TabRootLargeTitle>
        )
      }
    />
  );
}
