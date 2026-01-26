"use client";

import { Paper, Divider, Group, Text } from "@mantine/core";
import { IconGlobe, IconLanguage } from "@tabler/icons-react";
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
    <Paper withBorder p="md">
      <Group gap="xs" mb="md">
        <IconGlobe size={20} stroke={1.5} />
        <Text size="lg" fw={600}>
          Preferences
        </Text>
      </Group>

      <TimezonePicker
        value={contact.timezone || "UTC"}
        onChange={(value) => handleChange("timezone", value)}
        onBlur={(value) => handleBlur("timezone", value)}
        label="Timezone"
        placeholder="Select timezone..."
        loading={savingField === "timezone"}
      />

      <Divider my="md" />

      <LanguagePicker
        value={contact.language || "en"}
        onChange={(value) => handleChange("language", value)}
        onBlur={(value) => handleBlur("language", value)}
        label="Preferred Language"
        placeholder="Select language..."
        languages={WORLD_LANGUAGES_DATA}
        loading={savingField === "language"}
      />
    </Paper>
  );
}
