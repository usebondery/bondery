"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconPuzzle } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

export function ChromeExtensionModalTitle() {
  const t = useSettingsPageTranslations("Integration.ChromeExtensionModal");
  return <ModalTitle icon={<IconPuzzle size={20} stroke={1.5} />} text={t("IntroTitle")} />;
}
