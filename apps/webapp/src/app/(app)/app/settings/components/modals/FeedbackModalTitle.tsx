"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconMessageCircle } from "@tabler/icons-react";
import { useFeedbackPageTranslations } from "@/lib/i18n/generated/hooks";

export function FeedbackModalTitle() {
  const t = useFeedbackPageTranslations();
  return <ModalTitle icon={<IconMessageCircle size={20} stroke={1.5} />} text={t("Title")} />;
}
