"use client";

import { TileCard } from "@bondery/mantine-next";
import { ThemeIcon } from "@mantine/core";
import { IconDatabaseExport } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { openBonderyExportModal } from "../modals/openBonderyExportModal";

export function BonderyExportSection() {
  const t = useSettingsPageTranslations("DataManagement.Export");

  return (
    <TileCard
      actionLabel={t("Button")}
      description={t("ModalBody")}
      icon={
        <ThemeIcon radius="md" size={32} variant="filled">
          <IconDatabaseExport size={19} stroke={1.7} />
        </ThemeIcon>
      }
      onClick={() => openBonderyExportModal({ entryPoint: "settings" })}
      title={t("Title")}
      variant="link"
    />
  );
}
