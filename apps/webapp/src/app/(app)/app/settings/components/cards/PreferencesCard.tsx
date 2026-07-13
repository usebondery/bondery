"use client";

import { APP_LANGUAGES_DATA } from "@bondery/helpers/locale";
import {
  errorNotificationTemplate,
  HelpButton,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { ColorSchemePreference, TimeFormatPreference } from "@bondery/schemas";
import type { SupportedLocale } from "@bondery/translations";
import { coerceSupportedLocale, DEFAULT_LOCALE } from "@bondery/translations";
import { CardSection, Group, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { refreshAppShell } from "@/lib/app/refreshAppShell";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useApplyUserLanguage } from "@/lib/i18n/useApplyUserLanguage";
import { useSettingsQuery, useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";
import { ReminderTimePicker } from "./ReminderTimePicker";
import { SettingsSection } from "./SettingsSection";
import { ThemePicker } from "./ThemePicker";
import { TimeFormatPicker } from "./TimeFormatPicker";

function parseSettingsPreferences(settings: Record<string, unknown>): {
  colorScheme: ColorSchemePreference;
  language: SupportedLocale;
  reminderSendHour: string;
  timeFormat: TimeFormatPreference;
  timezone: string;
} {
  const timezone = typeof settings.timezone === "string" ? settings.timezone : "UTC";
  const reminderSendHour =
    typeof settings.reminderSendHour === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(settings.reminderSendHour)
      ? settings.reminderSendHour
      : "08:00:00";
  const timeFormat: TimeFormatPreference = settings.timeFormat === "12h" ? "12h" : "24h";
  const rawLanguage = typeof settings.language === "string" ? settings.language : DEFAULT_LOCALE;
  const language = coerceSupportedLocale(rawLanguage);
  const colorScheme: ColorSchemePreference =
    settings.colorScheme === "light" ||
    settings.colorScheme === "dark" ||
    settings.colorScheme === "auto"
      ? settings.colorScheme
      : "auto";

  return { colorScheme, language, reminderSendHour, timeFormat, timezone };
}

export function PreferencesCard() {
  const t = useSettingsPageTranslations("Preferences");
  const { data: settingsResult } = useSettingsQuery();
  const preferences = useMemo(
    () => parseSettingsPreferences(settingsResult?.data ?? {}),
    [settingsResult?.data],
  );

  const updateSettings = useUpdateSettingsMutation();
  const applyUserLanguage = useApplyUserLanguage();
  const [language, setLanguage] = useState(preferences.language);
  const [savedLanguage, setSavedLanguage] = useState(preferences.language);
  const [timezone, setTimezone] = useState(preferences.timezone);
  const [savedTimezone, setSavedTimezone] = useState(preferences.timezone);
  const [timeFormat, setTimeFormat] = useState<TimeFormatPreference>(preferences.timeFormat);

  useEffect(() => {
    setLanguage(preferences.language);
    setSavedLanguage(preferences.language);
    setTimezone(preferences.timezone);
    setSavedTimezone(preferences.timezone);
    setTimeFormat(preferences.timeFormat);
  }, [preferences.language, preferences.timezone, preferences.timeFormat]);

  const renderFieldLabel = (label: string, tooltip: string) => (
    <Group align="center" component="span" gap={4} wrap="nowrap">
      <Text component="span" fw={500} size="sm">
        {label}
      </Text>
      <HelpButton ariaLabel={`${label} information`} label={tooltip} variant="subtle" />
    </Group>
  );

  const persistTimezone = async (nextTimezone: string) => {
    if (!nextTimezone || nextTimezone === savedTimezone) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingTimezone"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ timezone: nextTimezone });

      setSavedTimezone(nextTimezone);
      refreshAppShell();

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("TimezoneUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setTimezone(savedTimezone);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("TimezoneUpdateError"),
          title: t("UpdateError"),
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
        description: t("PleaseWait"),
        title: t("UpdatingLanguage"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ language: nextLanguage });

      setSavedLanguage(nextLanguage);
      await applyUserLanguage(nextLanguage as SupportedLocale);
      refreshAppShell();

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("LanguageUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setLanguage(savedLanguage);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("LanguageUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  return (
    <SettingsSection icon={<IconAdjustmentsHorizontal size={20} stroke={1.5} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <ThemePicker
          initialValue={preferences.colorScheme}
          label={renderFieldLabel(t("Theme"), t("ThemeTooltip"))}
        />
      </CardSection>

      <CardSection inheritPadding pb="md">
        <Group align="flex-start" grow wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <LanguagePicker
              initialValue={preferences.language}
              label={renderFieldLabel(t("Language"), t("LanguageTooltip"))}
              languages={APP_LANGUAGES_DATA}
              onBlur={(nextLanguage) => {
                void persistLanguage(nextLanguage);
              }}
              onChange={setLanguage}
              placeholder={t("LanguageSearch")}
              value={language}
            />
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <TimezonePicker
              label={renderFieldLabel(t("Timezone"), t("TimezoneTooltip"))}
              onBlur={(value) => {
                void persistTimezone(value);
              }}
              onChange={setTimezone}
              placeholder={t("TimezoneSearch")}
              value={timezone}
            />
          </div>
        </Group>
      </CardSection>

      <CardSection inheritPadding pb="md">
        <Group align="flex-start" grow wrap="wrap">
          <div style={{ flex: 1, minWidth: 260 }}>
            <ReminderTimePicker
              initialTime={preferences.reminderSendHour}
              label={renderFieldLabel(t("ReminderTime"), t("ReminderTimeTooltip"))}
              timeFormat={timeFormat}
            />
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <TimeFormatPicker
              initialTimeFormat={preferences.timeFormat}
              label={renderFieldLabel(t("TimeFormat"), t("TimeFormatTooltip"))}
              onTimeFormatChange={setTimeFormat}
            />
          </div>
        </Group>
      </CardSection>
    </SettingsSection>
  );
}
