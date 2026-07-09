import type { ReactNode } from "react";
import { TabRootLargeTitle, TabRootScreenHeader } from "../../../components/chrome";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useContactsSelectionMode } from "../contactsSelectionStore";
import { ContactsSelectionHeader } from "./ContactsSelectionHeader";

interface ContactsScreenHeaderProps {
  accessory: ReactNode;
}

export function ContactsScreenHeader({ accessory }: ContactsScreenHeaderProps) {
  const t = useMobileTranslations();
  const selectionMode = useContactsSelectionMode();

  return (
    <TabRootScreenHeader
      accessory={accessory}
      titleRow={
        selectionMode ? (
          <ContactsSelectionHeader />
        ) : (
          <TabRootLargeTitle>{t("Title", { ns: "MobileContacts" })}</TabRootLargeTitle>
        )
      }
    />
  );
}
