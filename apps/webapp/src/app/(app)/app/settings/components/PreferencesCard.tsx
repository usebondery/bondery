"use client";

import { CardSection, Group, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { getQueryClient } from "@/lib/query/client";
import { invalidateSettings } from "@/lib/query/invalidation";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import type { ColorSchemePreference } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import {
  errorNotificationTemplate,
  HelpButton,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { ThemePicker } from "./ThemePicker";
import { SettingsSection } from "./SettingsSection";
import { ReminderTimePicker } from "./ReminderTimePicker";
import { TimeFormatPicker } from "./TimeFormatPicker";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { APP_LANGUAGES_DATA } from "@bondery/helpers/locale";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";
import { useApplyUserLanguage } from "@/lib/i18n/useApplyUserLanguage";
import type { SupportedLocale } from "@bondery/translations";

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
  const tLanguages = useTranslations("Languages");
  const updateSettings = useUpdateSettingsMutation();
  const applyUserLanguage = useApplyUserLanguage();
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
      <HelpButton label={tooltip} ariaLabel={`${label} information`} variant="subtle" />
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
      await updateSettings.mutateAsync({ timezone: nextTimezone });

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
      await updateSettings.mutateAsync({ language: nextLanguage });

      setSavedLanguage(nextLanguage);
      await applyUserLanguage(nextLanguage as SupportedLocale);

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
              getLocalizedLabel={(appLanguage) => tLanguages(appLanguage.value)}
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
              onTimeFormatSaved={() => void invalidateSettings(getQueryClient())}
              label={renderFieldLabel(t("TimeFormat"), t("TimeFormatTooltip"))}
            />
          </div>
        </Group>
      </CardSection>
    </SettingsSection>
  );
}
