"use client";

import { BrandIcon } from "@bondery/branding";
import { TileCard } from "@bondery/mantine-next";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { openInstagramImportModal } from "../modals/openInstagramImportModal";

export function InstagramImportSection() {
  const t = useSettingsPageTranslations("DataManagement.InstagramImport");
  const tDataManagement = useSettingsPageTranslations("DataManagement");

  return (
    <TileCard
      actionLabel={t("ImportAction")}
      caption={tDataManagement("CategorySocials")}
      description={t("IntroDescription1")}
      icon={<BrandIcon name="instagram" size={32} />}
      onClick={() => openInstagramImportModal()}
      title={t("Instagram")}
      variant="link"
    />
  );
}
