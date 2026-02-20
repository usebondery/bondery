"use client";

import { Stack } from "@mantine/core";
import { IconBrandInstagram, IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { modals } from "@mantine/modals";
import { ModalTitle } from "@bondery/mantine-next";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { InstagramImportModal } from "@/app/(app)/app/settings/components/InstagramImportModal";

export function InstagramImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.InstagramImport");

  const openImporter = () => {
    modals.open({
      title: <ModalTitle text={t("ModalTitle")} icon={<IconDownload size={20} stroke={1.5} />} />,
      centered: true,
      size: "xl",
      children: <InstagramImportModal t={t} />,
    });
  };

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
        onClick={openImporter}
      />
    </Stack>
  );
}
