"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconSparkles } from "@tabler/icons-react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

export function McpModalTitle() {
  const t = useSettingsPageTranslations("AiAssistants");

  return <ModalTitle icon={<IconSparkles size={20} stroke={1.5} />} text={t("Title")} />;
}
