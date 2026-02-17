"use client";

import { Group, Stack, Text } from "@mantine/core";
import { IconBrandInstagram, IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { modals } from "@mantine/modals";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { InstagramImportModal } from "@/app/(app)/app/settings/components/InstagramImportModal";

export function InstagramImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.InstagramImport");

  const openImporter = () => {
    modals.open({
      title: (
        <Group gap="xs">
          <IconDownload size={20} stroke={1.5} />
          <Text fw={600}>{t("ModalTitle")}</Text>
        </Group>
      ),
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
