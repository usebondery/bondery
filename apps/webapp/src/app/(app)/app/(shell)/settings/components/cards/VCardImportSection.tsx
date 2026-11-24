"use client";

import { TileCard } from "@bondery/mantine-next";
import { ThemeIcon } from "@mantine/core";
import { IconAddressBook } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { openVCardImportModal } from "../modals/openVCardImportModal";

export function VCardImportSection() {
  const t = useSettingsPageTranslations("DataManagement.VCardImport");
  const tDataManagement = useSettingsPageTranslations("DataManagement");

  return (
    <TileCard
      actionLabel={t("ImportAction")}
      caption={tDataManagement("CategoryContacts")}
      description={t("IntroDescription1")}
      icon={
        <ThemeIcon radius="md" size={32} variant="filled">
          <IconAddressBook size={19} stroke={1.7} />
        </ThemeIcon>
      }
      onClick={() => openVCardImportModal()}
      title={t("MobileContacts")}
      variant="link"
    />
  );
}
