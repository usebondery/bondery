"use client";

import { Group } from "@mantine/core";
import type { Contact } from "@bondery/types";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { WORLD_LANGUAGES_DATA } from "@/lib/languages";

interface ContactPreferenceSectionProps {
  contact: Contact;
  savingField: string | null;
  handleChange: (field: string, value: string) => void;
  handleBlur: (field: string, value: string) => void;
}

export function ContactPreferenceSection({
  contact,
  savingField,
  handleChange,
  handleBlur,
}: ContactPreferenceSectionProps) {
  return (
    <Group align="flex-start" grow wrap="wrap">
      <div style={{ flex: 1, minWidth: 260 }}>
        <LanguagePicker
          value={contact.language || "en"}
          onChange={(value) => handleChange("language", value)}
          onBlur={(value) => handleBlur("language", value)}
          label="Preferred Language"
          placeholder="Select language..."
          languages={WORLD_LANGUAGES_DATA}
          loading={savingField === "language"}
        />
      </div>

      <div style={{ flex: 1, minWidth: 260 }}>
        <TimezonePicker
          value={contact.timezone || "UTC"}
          onChange={(value) => handleChange("timezone", value)}
          onBlur={(value) => handleBlur("timezone", value)}
          label="Timezone"
          placeholder="Select timezone..."
          loading={savingField === "timezone"}
        />
      </div>
    </Group>
  );
}
