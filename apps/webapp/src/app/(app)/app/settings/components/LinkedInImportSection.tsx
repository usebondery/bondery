"use client";

import { IconBrandLinkedin, IconDownload } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { openLinkedInImportModal } from "./openLinkedInImportModal";

export function LinkedInImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.LinkedInImport");

  return (
    <IntegrationCard
      provider="linkedin_import"
      displayName={t("LinkedIn")}
      icon={IconBrandLinkedin}
      iconColor="blue"
      isConnected={false}
      isDisabled={false}
      isLinkable={false}
      connectedDescription={t("CardDescription")}
      unconnectedDescription={t("CardDescription")}
      onClick={() => openLinkedInImportModal({ t })}
    />
  );
}
