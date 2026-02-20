"use client";

import { IconBrandLinkedin, IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { modals } from "@mantine/modals";
import { ModalTitle } from "@bondery/mantine-next";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { LinkedInImportModal } from "./LinkedInImportModal";

export function LinkedInImportSection() {
  const t = useTranslations("SettingsPage.DataManagement.LinkedInImport");

  const openImporter = () => {
    modals.open({
      title: <ModalTitle text={t("ModalTitle")} icon={<IconDownload size={20} stroke={1.5} />} />,
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
