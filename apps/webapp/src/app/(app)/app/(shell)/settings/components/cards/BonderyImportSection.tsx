"use client";

import { TileCard } from "@bondery/mantine-next";
import { ThemeIcon } from "@mantine/core";
import { IconDatabaseImport } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { openBonderyImportModal } from "../modals/openBonderyImportModal";

export function BonderyImportSection() {
  const t = useSettingsPageTranslations("DataManagement.BonderyImport");

  return (
    <TileCard
      actionLabel={t("ImportAction")}
      description={t("IntroDescription1")}
      icon={
        <ThemeIcon radius="md" size={32} variant="filled">
          <IconDatabaseImport size={19} stroke={1.7} />
        </ThemeIcon>
      }
      onClick={() => openBonderyImportModal({ entryPoint: "settings" })}
      title={t("CardTitle")}
      variant="link"
    />
  );
}
