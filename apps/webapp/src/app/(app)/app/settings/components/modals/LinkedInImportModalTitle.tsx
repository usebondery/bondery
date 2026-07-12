"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconDownload } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

export function LinkedInImportModalTitle() {
  const t = useSettingsPageTranslations("DataManagement.LinkedInImport");
  return <ModalTitle icon={<IconDownload size={20} stroke={1.5} />} text={t("ModalTitle")} />;
}
