// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { APP_LANGUAGES_DATA } from "@bondery/helpers/locale";
import {
  countryToCallingCode,
  findTelephonePrefixOption,
  TELEPHONE_PREFIX_OPTIONS,
} from "@bondery/helpers/phone";
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
import { useEffect, useState } from "react";
import {
  PreferencesField,
  PreferencesFieldRow,
  PreferencesFormBody,
  PreferencesThemeField,
} from "@/app/(app)/app/(shell)/settings/components/PreferencesFormLayout";
import { DefaultPhoneCountryPicker } from "@/components/shared/DefaultPhoneCountryPicker";
import { LanguagePicker } from "@/components/shared/LanguagePicker";
import { TimezonePicker } from "@/components/shared/TimezonePicker";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useApplyUserLanguage } from "@/lib/i18n/useApplyUserLanguage";
import { useSettingsQuery, useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";
import { ReminderTimePicker } from "./ReminderTimePicker";
import { buildReminderSendHourPayload, reminderSendHourToPickerValue } from "./reminderTimeValue";
import { SettingsSection } from "./SettingsSection";
import { ThemePicker } from "./ThemePicker";
import { TimeFormatPicker } from "./TimeFormatPicker";

function callingPrefixFromCountry(country: string | null): string {
  if (!country) {
    return "";
  }
  const normalized = country.trim().toUpperCase();
  const byCountry = TELEPHONE_PREFIX_OPTIONS.find(
    (option) => option.countryCode.toUpperCase() === normalized,
  );
  if (byCountry) {
    return byCountry.value;
  }
  return countryToCallingCode(country) ?? "";
}

function countryCodeFromCallingPrefix(prefix: string): string | null {
  return findTelephonePrefixOption(prefix)?.countryCode ?? null;
}

function parseSettingsPreferences(settings: Record<string, unknown>): {
  colorScheme: ColorSchemePreference;
  defaultPhoneCountry: string | null;
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
  const defaultPhoneCountry =
    typeof settings.defaultPhoneCountry === "string" ? settings.defaultPhoneCountry : null;

  return { colorScheme, defaultPhoneCountry, language, reminderSendHour, timeFormat, timezone };
}

export function PreferencesCard() {
  const t = useSettingsPageTranslations("Preferences");
  const { data: settingsResult } = useSettingsQuery();
  const settingsData = settingsResult?.data;
  const preferences = settingsData ? parseSettingsPreferences(settingsData) : undefined;

  const updateSettings = useUpdateSettingsMutation();
  const applyUserLanguage = useApplyUserLanguage();
  const [language, setLanguage] = useState(preferences?.language ?? DEFAULT_LOCALE);
  const [savedLanguage, setSavedLanguage] = useState(preferences?.language ?? DEFAULT_LOCALE);
  const [timezone, setTimezone] = useState(preferences?.timezone ?? "UTC");
  const [savedTimezone, setSavedTimezone] = useState(preferences?.timezone ?? "UTC");
  const [timeFormat, setTimeFormat] = useState<TimeFormatPreference>(
    preferences?.timeFormat ?? "24h",
  );
  const [savedTimeFormat, setSavedTimeFormat] = useState<TimeFormatPreference>(
    preferences?.timeFormat ?? "24h",
  );
  const [reminderHour, setReminderHour] = useState(() =>
    reminderSendHourToPickerValue(preferences?.reminderSendHour ?? "08:00:00"),
  );
  const [savedReminderHour, setSavedReminderHour] = useState(() =>
    reminderSendHourToPickerValue(preferences?.reminderSendHour ?? "08:00:00"),
  );
  const [defaultPhonePrefix, setDefaultPhonePrefix] = useState(() =>
    callingPrefixFromCountry(preferences?.defaultPhoneCountry ?? null),
  );
  const [savedDefaultPhoneCountry, setSavedDefaultPhoneCountry] = useState<string | null>(
    preferences?.defaultPhoneCountry ?? null,
  );

  useEffect(() => {
    if (!preferences) {
      return;
    }
    setLanguage(preferences.language);
    setSavedLanguage(preferences.language);
    setTimezone(preferences.timezone);
    setSavedTimezone(preferences.timezone);
    setTimeFormat(preferences.timeFormat);
    setSavedTimeFormat(preferences.timeFormat);
    const nextReminderHour = reminderSendHourToPickerValue(preferences.reminderSendHour);
    setReminderHour(nextReminderHour);
    setSavedReminderHour(nextReminderHour);
    setDefaultPhonePrefix(callingPrefixFromCountry(preferences.defaultPhoneCountry));
    setSavedDefaultPhoneCountry(preferences.defaultPhoneCountry);
  }, [preferences]);

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

  const persistDefaultPhoneCountry = async (nextPrefix: string) => {
    const nextCountry = countryCodeFromCallingPrefix(nextPrefix);
    if (!nextCountry || nextCountry === savedDefaultPhoneCountry) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingDefaultPhoneCountry"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ defaultPhoneCountry: nextCountry });

      setSavedDefaultPhoneCountry(nextCountry);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("DefaultPhoneCountryUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setDefaultPhonePrefix(callingPrefixFromCountry(savedDefaultPhoneCountry));

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("DefaultPhoneCountryUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  const persistTimeFormat = async (nextFormat: TimeFormatPreference) => {
    if (nextFormat === savedTimeFormat) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingTimeFormat"),
      }),
    });

    try {
      await updateSettings.mutateAsync({ timeFormat: nextFormat });

      setSavedTimeFormat(nextFormat);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("TimeFormatUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setTimeFormat(savedTimeFormat);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("TimeFormatUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  const persistReminderHour = async (nextPickerValue: string) => {
    const payload = buildReminderSendHourPayload(nextPickerValue);

    if (!payload.ok) {
      if (payload.kind === "invalid") {
        notifications.show(
          errorNotificationTemplate({
            description: t("InvalidReminderTime"),
            title: t("UpdateError"),
          }),
        );
      } else {
        notifications.show(
          errorNotificationTemplate({
            description: payload.message,
            title: t("UpdateError"),
          }),
        );
      }
      setReminderHour(savedReminderHour);
      return;
    }

    if (payload.pickerValue === savedReminderHour) {
      setReminderHour(payload.pickerValue);
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingReminderTime"),
      }),
    });

    try {
      await updateSettings.mutateAsync({
        reminderSendHour: payload.apiTime,
      });

      setSavedReminderHour(payload.pickerValue);
      setReminderHour(payload.pickerValue);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("ReminderTimeUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setReminderHour(savedReminderHour);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("ReminderTimeUpdateError"),
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

  if (!preferences) {
    return null;
  }

  return (
    <SettingsSection
      icon={<IconAdjustmentsHorizontal size={20} stroke={1.5} />}
      id="preferences"
      title={t("Title")}
    >
      <CardSection inheritPadding pb="md" pt="md">
        <PreferencesFormBody>
          <PreferencesThemeField>
            <ThemePicker
              initialValue={preferences.colorScheme}
              label={renderFieldLabel(t("Theme"), t("ThemeTooltip"))}
            />
          </PreferencesThemeField>

          <PreferencesFieldRow>
            <PreferencesField>
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
            </PreferencesField>

            <PreferencesField>
              <DefaultPhoneCountryPicker
                label={renderFieldLabel(t("DefaultPhoneCountry"), t("DefaultPhoneCountryTooltip"))}
                onBlur={(nextPrefix) => {
                  void persistDefaultPhoneCountry(nextPrefix);
                }}
                onChange={setDefaultPhonePrefix}
                value={defaultPhonePrefix}
              />
            </PreferencesField>
          </PreferencesFieldRow>

          <PreferencesFieldRow>
            <PreferencesField>
              <TimezonePicker
                label={renderFieldLabel(t("Timezone"), t("TimezoneTooltip"))}
                onBlur={(value) => {
                  void persistTimezone(value);
                }}
                onChange={setTimezone}
                placeholder={t("TimezoneSearch")}
                value={timezone}
              />
            </PreferencesField>

            <PreferencesField>
              <TimeFormatPicker
                label={renderFieldLabel(t("TimeFormat"), t("TimeFormatTooltip"))}
                onChange={(nextFormat) => {
                  setTimeFormat(nextFormat);
                  void persistTimeFormat(nextFormat);
                }}
                value={timeFormat}
              />
            </PreferencesField>
          </PreferencesFieldRow>

          <PreferencesFieldRow>
            <PreferencesField>
              <ReminderTimePicker
                label={renderFieldLabel(t("ReminderTime"), t("ReminderTimeTooltip"))}
                onBlur={() => {
                  void persistReminderHour(reminderHour);
                }}
                onChange={setReminderHour}
                timeFormat={timeFormat}
                value={reminderHour}
              />
            </PreferencesField>
          </PreferencesFieldRow>
        </PreferencesFormBody>
      </CardSection>
    </SettingsSection>
  );
}
