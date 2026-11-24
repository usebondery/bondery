"use client";

import { BrandIcon } from "@bondery/branding";
import { TileCard } from "@bondery/mantine-next";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { openLinkedInImportModal } from "../modals/openLinkedInImportModal";

export function LinkedInImportSection() {
  const t = useSettingsPageTranslations("DataManagement.LinkedInImport");
  const tDataManagement = useSettingsPageTranslations("DataManagement");

  return (
    <TileCard
      actionLabel={t("ImportAction")}
      caption={tDataManagement("CategorySocials")}
      description={t("IntroDescription1")}
      icon={<BrandIcon name="linkedin" size={32} />}
      onClick={() => openLinkedInImportModal()}
      title={t("LinkedIn")}
      variant="link"
    />
  );
}
