"use client";

import { IconAddressBook } from "@tabler/icons-react";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { openVCardImportModal } from "./openVCardImportModal";

export function VCardImportSection() {
  const t = useWebTranslations("SettingsPage", "DataManagement.VCardImport");

  return (
    <IntegrationCard
      connectedDescription={t("CardDescription")}
      displayName={t("MobileContacts")}
      icon={IconAddressBook}
      iconColor="green"
      isConnected={false}
      isDisabled={false}
      isLinkable={false}
      onClick={() => openVCardImportModal()}
      provider="vcard_import"
      unconnectedDescription={t("CardDescription")}
    />
  );
}
