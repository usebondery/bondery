"use client";

import { IconBrandLinkedin } from "@tabler/icons-react";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { openLinkedInImportModal } from "./openLinkedInImportModal";

export function LinkedInImportSection() {
  const t = useWebTranslations("SettingsPage", "DataManagement.LinkedInImport");

  return (
    <IntegrationCard
      connectedDescription={t("CardDescription")}
      displayName={t("LinkedIn")}
      icon={IconBrandLinkedin}
      iconColor="blue"
      isConnected={false}
      isDisabled={false}
      isLinkable={false}
      onClick={() => openLinkedInImportModal()}
      provider="linkedin_import"
      unconnectedDescription={t("CardDescription")}
    />
  );
}
