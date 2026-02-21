"use client";

import { Stack, Text } from "@mantine/core";
import { TimePicker } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface ReminderTimePickerProps {
  initialTime: string;
  label?: ReactNode;
  description?: string;
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

export function ReminderTimePicker({ initialTime, label, description }: ReminderTimePickerProps) {
  const t = useTranslations("SettingsPage.Preferences");
  const initialHourValue = roundToHourValue(toInputTime(initialTime));
  const [value, setValue] = useState(initialHourValue);
  const [savedTime, setSavedTime] = useState(initialHourValue);

  const presetGroups = [
    { label: t("PresetMorning"), values: ["06:00", "07:00", "08:00", "09:00", "10:00"] },
    {
      label: t("PresetAfternoon"),
      values: ["12:00", "13:00", "14:00", "15:00", "16:00"],
    },
    { label: t("PresetEvening"), values: ["18:00", "19:00", "20:00", "21:00", "22:00"] },
  ];

  const persistReminderHour = async (nextValue: string) => {
    const normalizedInputTime = roundToHourValue(normalizeTimeValue(nextValue));
    const apiTime = toApiTime(normalizedInputTime);

    setValue(normalizedInputTime);

    if (!apiTime) {
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("InvalidReminderTime"),
        }),
      );
      setValue(savedTime);
      return;
    }

    if (normalizedInputTime === savedTime) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingReminderTime"),
        description: t("PleaseWait"),
      }),
    });

    try {
      const response = await fetch(API_ROUTES.SETTINGS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reminder_send_hour: apiTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reminder_send_hour");
      }

      setSavedTime(normalizedInputTime);
      setValue(normalizedInputTime);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("ReminderTimeUpdateSuccess"),
        }),
      );
    } catch {
      setValue(savedTime);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("ReminderTimeUpdateError"),
        }),
      );
    }
  };

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label ?? t("ReminderTime")}
      </Text>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <TimePicker
        value={value}
        onChange={(nextValue) => {
          if (!nextValue) {
            return;
          }

          setValue(nextValue);
        }}
        onBlur={() => {
          void persistReminderHour(value);
        }}
        withDropdown
        presets={presetGroups}
        minutesStep={60}
      />
    </Stack>
  );
}
