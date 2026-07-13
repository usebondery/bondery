"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconDownload } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

export function InstagramImportModalTitle() {
  const t = useSettingsPageTranslations("DataManagement.InstagramImport");
  return <ModalTitle icon={<IconDownload size={20} stroke={1.5} />} text={t("ModalTitle")} />;
}
