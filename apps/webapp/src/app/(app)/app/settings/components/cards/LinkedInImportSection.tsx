"use client";

import { IconBrandLinkedin } from "@tabler/icons-react";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { openLinkedInImportModal } from "../modals/openLinkedInImportModal";

export function LinkedInImportSection() {
  const t = useSettingsPageTranslations("DataManagement.LinkedInImport");

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
