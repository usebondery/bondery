"use client";

import { Text } from "@mantine/core";
import type { Contact } from "@bondery/schemas";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";

interface LastInteractionSectionProps {
  contact: Contact;
}

export function LastInteractionSection({ contact }: LastInteractionSectionProps) {
  const t = useTranslations("InteractionsPage");
  const formatter = useFormatter();

  return (
    <div>
      <Text size="sm" fw={600} mb="xs">
        {t("LastInteractionInput")}
      </Text>
      <Text size="sm" c="dimmed">
        {contact.lastInteraction
          ? formatter.dateTime(new Date(contact.lastInteraction), {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : t("NoInteractionRecorded")}
      </Text>
    </div>
  );
}
