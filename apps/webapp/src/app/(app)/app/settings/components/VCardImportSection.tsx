"use client";

import { IconAddressBook } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { openVCardImportModal } from "./openVCardImportModal";

export function VCardImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.VCardImport");

  return (
    <IntegrationCard
      provider="vcard_import"
      displayName={t("MobileContacts")}
      icon={IconAddressBook}
      iconColor="green"
      isConnected={false}
      isDisabled={false}
      isLinkable={false}
      connectedDescription={t("CardDescription")}
      unconnectedDescription={t("CardDescription")}
      onClick={() => openVCardImportModal({ t })}
    />
  );
}
