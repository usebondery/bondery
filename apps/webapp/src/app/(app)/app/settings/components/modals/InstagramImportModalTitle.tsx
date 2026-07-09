"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconDownload } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

export function InstagramImportModalTitle() {
  const t = useWebTranslations("SettingsPage", "DataManagement.InstagramImport");
  return <ModalTitle icon={<IconDownload size={20} stroke={1.5} />} text={t("ModalTitle")} />;
}
