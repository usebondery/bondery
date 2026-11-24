// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { WORLD_LANGUAGES_DATA } from "@bondery/helpers/locale";
import type { Contact } from "@bondery/schemas";
import { DEFAULT_LOCALE } from "@bondery/translations";
import { Group } from "@mantine/core";
import { useEffect, useState } from "react";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { useContactPreferenceSectionTranslations } from "@/lib/i18n/generated/hooks";
import { nonEmpty } from "@/lib/shared/nonEmpty";

interface ContactPreferenceSectionProps {
  contact: Contact;
  handleBlur: (field: string, value: string) => void;
  savingField: string | null;
}

export function ContactPreferenceSection({
  contact,
  savingField,
  handleBlur,
}: ContactPreferenceSectionProps) {
  const t = useContactPreferenceSectionTranslations();
  const [language, setLanguage] = useState(nonEmpty(contact.language) ?? DEFAULT_LOCALE);
  const [timezone, setTimezone] = useState(nonEmpty(contact.timezone) ?? "UTC");

  useEffect(() => {
    setLanguage(nonEmpty(contact.language) ?? DEFAULT_LOCALE);
    setTimezone(nonEmpty(contact.timezone) ?? "UTC");
  }, [contact.language, contact.timezone]);

  return (
    <Group align="flex-start" grow wrap="wrap">
      <div style={{ flex: 1, minWidth: 260 }}>
        <LanguagePicker
          label={t("LanguageLabel")}
          languages={WORLD_LANGUAGES_DATA}
          loading={savingField === "language"}
          onBlur={(value) => handleBlur("language", value)}
          onChange={(value) => setLanguage(value)}
          placeholder={t("LanguagePlaceholder")}
          value={language}
        />
      </div>

      <div style={{ flex: 1, minWidth: 260 }}>
        <TimezonePicker
          label={t("TimezoneLabel")}
          loading={savingField === "timezone"}
          onBlur={(value) => handleBlur("timezone", value)}
          onChange={(value) => setTimezone(value)}
          placeholder={t("TimezonePlaceholder")}
          value={timezone}
        />
      </div>
    </Group>
  );
}
