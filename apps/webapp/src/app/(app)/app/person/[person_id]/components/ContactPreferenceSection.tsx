"use client";

import { Group } from "@mantine/core";
import type { Contact } from "@bondery/types";
import { useEffect, useState } from "react";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { WORLD_LANGUAGES_DATA } from "@/lib/languages";

interface ContactPreferenceSectionProps {
  contact: Contact;
  savingField: string | null;
  handleBlur: (field: string, value: string) => void;
}

export function ContactPreferenceSection({
  contact,
  savingField,
  handleBlur,
}: ContactPreferenceSectionProps) {
  const [language, setLanguage] = useState(contact.language || "en");
  const [timezone, setTimezone] = useState(contact.timezone || "UTC");

  useEffect(() => {
    setLanguage(contact.language || "en");
    setTimezone(contact.timezone || "UTC");
  }, [contact.language, contact.timezone]);

  return (
    <Group align="flex-start" grow wrap="wrap">
      <div style={{ flex: 1, minWidth: 260 }}>
        <LanguagePicker
          value={language}
          onChange={(value) => setLanguage(value)}
          onBlur={(value) => handleBlur("language", value)}
          label="Preferred Language"
          placeholder="Select language..."
          languages={WORLD_LANGUAGES_DATA}
          loading={savingField === "language"}
        />
      </div>

      <div style={{ flex: 1, minWidth: 260 }}>
        <TimezonePicker
          value={timezone}
          onChange={(value) => setTimezone(value)}
          onBlur={(value) => handleBlur("timezone", value)}
          label="Timezone"
          placeholder="Select timezone..."
          loading={savingField === "timezone"}
        />
      </div>
    </Group>
  );
}
