"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconDownload } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

export function VCardImportModalTitle() {
  const t = useWebTranslations("SettingsPage", "DataManagement.VCardImport");
  return <ModalTitle icon={<IconDownload size={20} stroke={1.5} />} text={t("ModalTitle")} />;
}
