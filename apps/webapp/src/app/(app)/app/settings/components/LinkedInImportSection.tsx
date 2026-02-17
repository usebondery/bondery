"use client";

import { Group, Text } from "@mantine/core";
import { IconBrandLinkedin, IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { modals } from "@mantine/modals";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { LinkedInImportModal } from "./LinkedInImportModal";

export function LinkedInImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.LinkedInImport");

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
      children: <LinkedInImportModal t={t} />,
    });
  };

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
      onClick={openImporter}
    />
  );
}
