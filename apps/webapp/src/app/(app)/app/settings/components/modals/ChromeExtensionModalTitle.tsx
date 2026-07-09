"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconPuzzle } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

export function ChromeExtensionModalTitle() {
  const t = useWebTranslations("SettingsPage", "Integration.ChromeExtensionModal");
  return <ModalTitle icon={<IconPuzzle size={20} stroke={1.5} />} text={t("IntroTitle")} />;
}
