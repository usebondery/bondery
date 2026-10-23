"use client";

import { Group, Stack, Text } from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { IconBell } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { parseReminderPickerInput } from "./reminderTimeValue";

interface ReminderTimePickerProps {
  description?: string;
  label?: ReactNode;
  onBlur: () => void;
  onChange: (nextValue: string) => void;
  timeFormat: "24h" | "12h";
  value: string;
}

export function ReminderTimePicker({
  value,
  onChange,
  onBlur,
  timeFormat,
  label,
  description,
}: ReminderTimePickerProps) {
  const t = useSettingsPageTranslations("Preferences");

  const presetGroups = [
    {
      label: t("PresetMorning"),
      values: ["06:00", "07:00", "08:00", "09:00", "10:00"],
    },
    {
      label: t("PresetAfternoon"),
      values: ["12:00", "13:00", "14:00", "15:00", "16:00"],
    },
    {
      label: t("PresetEvening"),
      values: ["18:00", "19:00", "20:00", "21:00", "22:00"],
    },
  ];

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {label ?? t("ReminderTime")}
      </Text>
      {description ? (
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      ) : null}
      <Group align="flex-end" grow wrap="wrap">
        <div style={{ flex: 1, minWidth: 220 }}>
          <TimePicker
            format={timeFormat}
            key={timeFormat}
            leftSection={<IconBell size={16} />}
            minutesStep={60}
            onBlur={onBlur}
            onChange={(nextValue) => {
              if (!nextValue) {
                return;
              }

              const parsedValue = parseReminderPickerInput(nextValue);
              if (!parsedValue) {
                return;
              }

              onChange(parsedValue);
            }}
            presets={presetGroups}
            value={value}
            withDropdown
          />
        </div>
      </Group>
    </Stack>
  );
}
