"use client";

import type { TimeFormatPreference } from "@bondery/schemas";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

interface TimeFormatPickerProps {
  description?: string;
  label?: ReactNode;
  onChange: (nextFormat: TimeFormatPreference) => void;
  value: TimeFormatPreference;
}

export function TimeFormatPicker({ value, onChange, label, description }: TimeFormatPickerProps) {
  const t = useSettingsPageTranslations("Preferences");

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {label ?? t("TimeFormat")}
      </Text>
      {description ? (
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      ) : null}
      <SegmentedControl
        data={[
          { label: t("TimeFormat24h"), value: "24h" },
          { label: t("TimeFormat12h"), value: "12h" },
        ]}
        fullWidth
        onChange={(nextValue) => {
          if (nextValue !== "24h" && nextValue !== "12h") {
            return;
          }

          onChange(nextValue);
        }}
        value={value}
      />
    </Stack>
  );
}
