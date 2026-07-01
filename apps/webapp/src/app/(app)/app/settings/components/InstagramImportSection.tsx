"use client";

import { Stack } from "@mantine/core";
import { IconBrandInstagram } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { openInstagramImportModal } from "./openInstagramImportModal";

export function InstagramImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.InstagramImport");

  return (
    <Stack gap="sm">
      <IntegrationCard
        provider="instagram_import"
        displayName={t("Instagram")}
        icon={IconBrandInstagram}
        iconColor="pink"
        isConnected={false}
        isDisabled={false}
        isLinkable={false}
        connectedDescription={t("CardDescription")}
        unconnectedDescription={t("CardDescription")}
        onClick={() => openInstagramImportModal({ t })}
      />
    </Stack>
  );
}
