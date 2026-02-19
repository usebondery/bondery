"use client";

import { Card, CardSection, Group, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import type { ColorSchemePreference } from "@bondery/types";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { ThemePicker } from "./ThemePicker";
import { ReminderTimePicker } from "./ReminderTimePicker";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { APP_LANGUAGES_DATA } from "@/lib/languages";

interface PreferencesCardProps {
  initialColorScheme: ColorSchemePreference;
  initialLanguage: string;
  initialTimezone: string;
  initialReminderSendHour: string;
}

export function PreferencesCard({
  initialColorScheme,
  initialLanguage,
  initialTimezone,
  initialReminderSendHour,
}: PreferencesCardProps) {
  const t = useTranslations("SettingsPage.Preferences");
  const [timezone, setTimezone] = useState(initialTimezone);
  const [savedTimezone, setSavedTimezone] = useState(initialTimezone);

  const persistTimezone = async (nextTimezone: string) => {
    if (!nextTimezone || nextTimezone === savedTimezone) {
      return;
    }

    const loadingNotification = notifications.show({
      title: t("UpdatingTimezone"),
      message: t("PleaseWait"),
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const response = await fetch(API_ROUTES.SETTINGS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timezone: nextTimezone,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update timezone");
      }

      setSavedTimezone(nextTimezone);

      notifications.hide(loadingNotification);
      notifications.show({
        title: t("UpdateSuccess"),
        message: t("TimezoneUpdateSuccess"),
        color: "green",
      });
    } catch {
      setTimezone(savedTimezone);

      notifications.hide(loadingNotification);
      notifications.show({
        title: t("UpdateError"),
        message: t("TimezoneUpdateError"),
        color: "red",
      });
    }
  };

  return (
    <Card withBorder shadow="sm">
      <CardSection withBorder inheritPadding py="md">
        <Group gap="xs">
          <IconAdjustmentsHorizontal size={20} stroke={1.5} />
          <Text size="lg" fw={600}>
            {t("Title")}
          </Text>
        </Group>
      </CardSection>

      <CardSection inheritPadding py="md">
        <ThemePicker initialValue={initialColorScheme} />
      </CardSection>

      <CardSection inheritPadding pb="md">
        <Group align="flex-start" grow wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <LanguagePicker
              initialValue={initialLanguage}
              label={t("Language")}
              placeholder={t("LanguageSearch")}
              description={t("LanguageDescription")}
              languages={APP_LANGUAGES_DATA}
              disabled
            />
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <TimezonePicker
              value={timezone}
              onChange={setTimezone}
              onBlur={(value) => {
                void persistTimezone(value);
              }}
              label={t("Timezone")}
              placeholder={t("TimezoneSearch")}
              description={t("TimezoneDescription")}
            />
          </div>
        </Group>
      </CardSection>

      <CardSection inheritPadding pb="md">
        <ReminderTimePicker
          initialTime={initialReminderSendHour}
          description={t("ReminderTimeDescription")}
        />
      </CardSection>
    </Card>
  );
}
