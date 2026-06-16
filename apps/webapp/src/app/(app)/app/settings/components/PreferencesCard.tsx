"use client";

import { ActionIcon, CardSection, Group, Text, Tooltip } from "@mantine/core";
import { IconAdjustmentsHorizontal, IconHelpCircle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ColorSchemePreference } from "@bondery/types";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { ThemePicker } from "./ThemePicker";
import { SettingsSection } from "./SettingsSection";
import { ReminderTimePicker } from "./ReminderTimePicker";
import { TimeFormatPicker } from "./TimeFormatPicker";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { APP_LANGUAGES_DATA } from "@/lib/languages";

interface PreferencesCardProps {
  initialColorScheme: ColorSchemePreference;
  initialLanguage: string;
  initialTimezone: string;
  initialReminderSendHour: string;
  initialTimeFormat: "24h" | "12h";
}

export function PreferencesCard({
  initialColorScheme,
  initialLanguage,
  initialTimezone,
  initialReminderSendHour,
  initialTimeFormat,
}: PreferencesCardProps) {
  const t = useTranslations("SettingsPage.Preferences");
  const router = useRouter();
  const [language, setLanguage] = useState(initialLanguage);
  const [savedLanguage, setSavedLanguage] = useState(initialLanguage);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [savedTimezone, setSavedTimezone] = useState(initialTimezone);
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);

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
      ...loadingNotificationTemplate({
        title: t("UpdatingTimezone"),
        description: t("PleaseWait"),
      }),
    });

    try {
      const response = await fetch(API_ROUTES.ME_SETTINGS, {
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
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("TimezoneUpdateSuccess"),
        }),
      );
    } catch {
      setTimezone(savedTimezone);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("TimezoneUpdateError"),
        }),
      );
    }
  };

  const persistLanguage = async (nextLanguage: string) => {
    if (!nextLanguage || nextLanguage === savedLanguage) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingLanguage"),
        description: t("PleaseWait"),
      }),
    });

    try {
      const response = await fetch(API_ROUTES.ME_SETTINGS, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: nextLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update language");
      }

      setSavedLanguage(nextLanguage);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("LanguageUpdateSuccess"),
        }),
      );
    } catch {
      setLanguage(savedLanguage);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("LanguageUpdateError"),
        }),
      );
    }
  };

  return (
    <SettingsSection icon={<IconAdjustmentsHorizontal size={20} stroke={1.5} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <ThemePicker
          initialValue={initialColorScheme}
          label={renderFieldLabel(t("Theme"), t("ThemeTooltip"))}
        />
      </CardSection>

      <CardSection inheritPadding pb="md">
        <Group align="flex-start" grow wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <LanguagePicker
              value={language}
              initialValue={initialLanguage}
              onChange={setLanguage}
              onBlur={(nextLanguage) => {
                void persistLanguage(nextLanguage);
              }}
              label={renderFieldLabel(t("Language"), t("LanguageTooltip"))}
              placeholder={t("LanguageSearch")}
              languages={APP_LANGUAGES_DATA}
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
        <Group align="flex-start" grow wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <ReminderTimePicker
              initialTime={initialReminderSendHour}
              timeFormat={timeFormat}
              label={renderFieldLabel(t("ReminderTime"), t("ReminderTimeTooltip"))}
            />
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <TimeFormatPicker
              initialTimeFormat={initialTimeFormat}
              onTimeFormatChange={setTimeFormat}
              onTimeFormatSaved={() => router.refresh()}
              label={renderFieldLabel(t("TimeFormat"), t("TimeFormatTooltip"))}
            />
          </div>
        </Group>
      </CardSection>
    </SettingsSection>
  );
}
