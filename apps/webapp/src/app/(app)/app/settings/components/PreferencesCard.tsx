"use client";

import { ActionIcon, Card, CardSection, Group, Text, Tooltip } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconHelpCircle } from "@tabler/icons-react";
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

  const renderFieldLabel = (label: string, tooltip: string) => (
    <Group component="span" gap={4} align="center" wrap="nowrap">
      <Text component="span" size="sm" fw={500}>
        {label}
      </Text>
      <Tooltip label={tooltip} multiline maw={320}>
        <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`${label} information`}>
          <IconHelpCircle size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );

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
              label={renderFieldLabel(t("Language"), t("LanguageTooltip"))}
              placeholder={t("LanguageSearch")}
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
              label={renderFieldLabel(t("Timezone"), t("TimezoneTooltip"))}
              placeholder={t("TimezoneSearch")}
            />
          </div>
        </Group>
      </CardSection>

      <CardSection inheritPadding pb="md">
        <ReminderTimePicker
          initialTime={initialReminderSendHour}
          label={renderFieldLabel(t("ReminderTime"), t("ReminderTimeTooltip"))}
        />
      </CardSection>
    </Card>
  );
}
