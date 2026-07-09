"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { firstZodErrorMessage, reminderSendHourSchema } from "@bondery/schemas";
import { Group, Stack, Text } from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconBell } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface ReminderTimePickerProps {
  description?: string;
  initialTime: string;
  label?: ReactNode;
  timeFormat: "24h" | "12h";
}

function parseInputTimeTo24h(value: string): string | null {
  const trimmed = value.trim();

  const match24h = trimmed.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match24h) {
    const hour = Number(match24h[1]);
    const minute = Number(match24h[2]);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      return null;
    }

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const match12h = trimmed.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);

  if (!match12h) {
    return null;
  }

  const hourRaw = Number(match12h[1]);
  const minute = Number(match12h[2]);
  const suffix = match12h[3].toUpperCase();

  if (Number.isNaN(hourRaw) || Number.isNaN(minute) || hourRaw < 1 || hourRaw > 12) {
    return null;
  }

  if (minute < 0 || minute > 59) {
    return null;
  }

  const hour24 = suffix === "PM" ? (hourRaw % 12) + 12 : hourRaw % 12;

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isValidTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value.trim());
}

function normalizeTimeValue(value: string): string {
  if (!isValidTimeValue(value)) {
    return "08:00";
  }

  const [hourPart, minutePart] = value.trim().split(":");

  return `${hourPart.padStart(2, "0")}:${minutePart.padStart(2, "0")}`;
}

function roundToHourValue(value: string): string {
  if (!isValidTimeValue(value)) {
    return "08:00";
  }

  const [hourPart, minutePart] = value.trim().split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return "08:00";
  }

  const roundedHour = (hour + (minute >= 30 ? 1 : 0)) % 24;
  return `${String(roundedHour).padStart(2, "0")}:00`;
}

function toApiTime(value: string): string | null {
  if (!isValidTimeValue(value)) {
    return null;
  }

  const [hourPart, minutePart, secondPart] = value.trim().split(":");
  const normalizedHour = hourPart.padStart(2, "0");
  const normalizedMinute = minutePart.padStart(2, "0");
  const normalizedSecond = (secondPart || "00").padStart(2, "0");

  return `${normalizedHour}:${normalizedMinute}:${normalizedSecond}`;
}

function toInputTime(value: string): string {
  const normalized = normalizeTimeValue(value);
  const [hourPart, minutePart] = normalized.split(":");

  if (!hourPart || !minutePart) {
    return "08:00";
  }

  return `${hourPart}:${minutePart}`;
}

export function ReminderTimePicker({
  initialTime,
  timeFormat,
  label,
  description,
}: ReminderTimePickerProps) {
  const t = useWebTranslations("SettingsPage", "Preferences");
  const updateSettingsMutation = useUpdateSettingsMutation();
  const initialHourValue = roundToHourValue(toInputTime(initialTime));
  const [value24h, setValue24h] = useState(initialHourValue);
  const [savedTime24h, setSavedTime24h] = useState(initialHourValue);

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

  const persistReminderHour = async (nextValue: string) => {
    const normalizedInputTime = roundToHourValue(normalizeTimeValue(nextValue));
    const apiTime = toApiTime(normalizedInputTime);

    setValue24h(normalizedInputTime);

    if (!apiTime) {
      notifications.show(
        errorNotificationTemplate({
          description: t("InvalidReminderTime"),
          title: t("UpdateError"),
        }),
      );
      setValue24h(savedTime24h);
      return;
    }

    const parsedReminderTime = reminderSendHourSchema.safeParse(apiTime);
    if (!parsedReminderTime.success) {
      notifications.show(
        errorNotificationTemplate({
          description: firstZodErrorMessage(parsedReminderTime.error),
          title: t("UpdateError"),
        }),
      );
      setValue24h(savedTime24h);
      return;
    }

    if (normalizedInputTime === savedTime24h) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingReminderTime"),
      }),
    });

    try {
      await updateSettingsMutation.mutateAsync({
        reminderSendHour: parsedReminderTime.data,
      });

      setSavedTime24h(normalizedInputTime);
      setValue24h(normalizedInputTime);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("ReminderTimeUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setValue24h(savedTime24h);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("ReminderTimeUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {label ?? t("ReminderTime")}
      </Text>
      {description && (
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      )}
      <Group align="flex-end" grow wrap="wrap">
        <div style={{ flex: 1, minWidth: 220 }}>
          <TimePicker
            format={timeFormat}
            key={timeFormat}
            leftSection={<IconBell size={16} />}
            minutesStep={60}
            onBlur={() => {
              void persistReminderHour(value24h);
            }}
            onChange={(nextValue) => {
              if (!nextValue) {
                return;
              }

              const parsedValue = parseInputTimeTo24h(nextValue);
              if (!parsedValue) {
                return;
              }

              setValue24h(parsedValue);
            }}
            presets={presetGroups}
            value={value24h}
            withDropdown
          />
        </div>
      </Group>
    </Stack>
  );
}
