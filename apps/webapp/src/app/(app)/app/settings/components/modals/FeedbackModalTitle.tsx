"use client";

import { ModalTitle } from "@bondery/mantine-next";
import { IconMessageCircle } from "@tabler/icons-react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

export function FeedbackModalTitle() {
  const t = useWebTranslations("FeedbackPage");
  return <ModalTitle icon={<IconMessageCircle size={20} stroke={1.5} />} text={t("Title")} />;
}
