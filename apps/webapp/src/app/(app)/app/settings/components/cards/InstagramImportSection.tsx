"use client";

import { Stack } from "@mantine/core";
import { IconBrandInstagram } from "@tabler/icons-react";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { openInstagramImportModal } from "./modals/openInstagramImportModal";

export function InstagramImportSection() {
  const t = useWebTranslations("SettingsPage", "DataManagement.InstagramImport");

  return (
    <Stack gap="sm">
      <IntegrationCard
        connectedDescription={t("CardDescription")}
        displayName={t("Instagram")}
        icon={IconBrandInstagram}
        iconColor="pink"
        isConnected={false}
        isDisabled={false}
        isLinkable={false}
        onClick={() => openInstagramImportModal()}
        provider="instagram_import"
        unconnectedDescription={t("CardDescription")}
      />
    </Stack>
  );
}
