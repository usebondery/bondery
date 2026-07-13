"use client";

import type { Contact } from "@bondery/schemas";
import { Text } from "@mantine/core";
import { useInteractionsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";

interface LastInteractionSectionProps {
  contact: Contact;
}

export function LastInteractionSection({ contact }: LastInteractionSectionProps) {
  const t = useInteractionsPageTranslations();
  const formatter = useFormatter();

  return (
    <div>
      <Text fw={600} mb="xs" size="sm">
        {t("LastInteractionInput")}
      </Text>
      <Text c="dimmed" size="sm">
        {contact.lastInteraction
          ? formatter.dateTime(new Date(contact.lastInteraction), {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : t("NoInteractionRecorded")}
      </Text>
    </div>
  );
}
