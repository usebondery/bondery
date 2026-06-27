import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { IconBell } from "@tabler/icons-react-native";
import {
  APP_LANGUAGES_DATA,
  countryCodeToFlagEmoji,
  formatLanguageDisplayLabel,
  getAppLanguageExonymTranslationKey,
  getDeviceTimezone,
  getTimezoneSelectOptions,
  resolveToCanonicalTimezone,
} from "@bondery/helpers/locale";
import { fetchSettings, updateSettings } from "../../lib/api/client";
import type {
  MobileLocale,
  MobilePreferencesState,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { StackNavBar } from "../../components/chrome";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsFieldHint } from "./components/SettingsFieldHint";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsSelect } from "./components/SettingsSelect";

type TimeFormatValue = "24h" | "12h";
type ReminderHourValue = `${string}:00:00`;

const LANGUAGE_FLAG_EMOJI: Record<string, string> = {
  gb: "🇬🇧",
  cz: "🇨🇿",
};

function normalizeReminderHour(value?: string): ReminderHourValue {
  const hour = Number.parseInt(value?.split(":")[0] ?? "", 10);

  if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
    return `${String(hour).padStart(2, "0")}:00:00`;
  }

  return "08:00:00";
}

function formatReminderHourLabel(hour: number, timeFormat: TimeFormatValue): string {
  if (timeFormat === "24h") {
    return `${String(hour).padStart(2, "0")}:00`;
  }

  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${period}`;
}

export function SettingsLanguageScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();

  const locale = useMobilePreferences(
    (state: MobilePreferencesState) => state.locale,
  );
  const setLocale = useMobilePreferences(
    (state: MobilePreferencesState) => state.setLocale,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(getDeviceTimezone());
  const [timeFormat, setTimeFormat] = useState<TimeFormatValue>("24h");
  const [reminderSendHour, setReminderSendHour] =
    useState<ReminderHourValue>("08:00:00");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetchSettings();

      const nextLanguage = response.data.language === "cs" ? "cs" : "en";
      const nextTimezone = resolveToCanonicalTimezone(
        response.data.timezone || getDeviceTimezone(),
      );
      const nextTimeFormat: TimeFormatValue =
        response.data.timeFormat === "12h" ? "12h" : "24h";

      if (nextLanguage !== locale) {
        setLocale(nextLanguage);
      }
      setTimezone(nextTimezone);
      setTimeFormat(nextTimeFormat);
      setReminderSendHour(normalizeReminderHour(response.data.reminderSendHour));
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("MobileApp.Settings.LanguageLoadErrorDescription"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [locale, setLocale, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const localeOptions = useMemo(
    () =>
      APP_LANGUAGES_DATA.map((language) => ({
        value: language.value as MobileLocale,
        label: formatLanguageDisplayLabel(
          t(getAppLanguageExonymTranslationKey(language.value)),
          language.nativeName,
        ),
        leftSection: (
          <Text style={styles.flag}>
            {LANGUAGE_FLAG_EMOJI[language.flag] ?? language.flag}
          </Text>
        ),
      })),
    [t],
  );

  const timezoneOptions = useMemo(
    () =>
      getTimezoneSelectOptions(timezone).map((timezoneOption) => ({
        value: timezoneOption.value,
        label: timezoneOption.label,
        searchKeywords: `${timezoneOption.value} ${timezoneOption.offsetLabel}`,
        leftSection: (
          <Text style={[styles.offsetLabel, { color: colors.textMuted }]}>
            {timezoneOption.offsetLabel}
          </Text>
        ),
        rightSection: (
          <Text style={styles.flag}>
            {countryCodeToFlagEmoji(timezoneOption.flag)}
          </Text>
        ),
      })),
    [colors.textMuted, timezone],
  );

  const timeFormatOptions: Array<{ value: TimeFormatValue; label: string }> = [
    {
      value: "24h",
      label: t("MobileApp.Settings.TimeFormat24h"),
    },
    {
      value: "12h",
      label: t("MobileApp.Settings.TimeFormat12h"),
    },
  ];

  const reminderHourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        value: `${String(hour).padStart(2, "0")}:00:00`,
        label: formatReminderHourLabel(hour, timeFormat),
      })),
    [timeFormat],
  );

  const handleLocaleChange = async (nextLocale: MobileLocale) => {
    if (nextLocale === locale) {
      return;
    }

    const previousLocale = locale;
    setLocale(nextLocale);

    try {
      await updateSettings({ language: nextLocale });
    } catch {
      setLocale(previousLocale);
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Common.UnknownError"),
      });
    }
  };

  const handleTimezoneChange = async (nextTimezone: string) => {
    if (nextTimezone === timezone) {
      return;
    }

    const previousTimezone = timezone;
    setTimezone(nextTimezone);

    try {
      await updateSettings({ timezone: nextTimezone });
    } catch {
      setTimezone(previousTimezone);
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Common.UnknownError"),
      });
    }
  };

  const handleTimeFormatChange = async (nextTimeFormat: TimeFormatValue) => {
    if (nextTimeFormat === timeFormat) {
      return;
    }

    const previousTimeFormat = timeFormat;
    setTimeFormat(nextTimeFormat);

    try {
      await updateSettings({ timeFormat: nextTimeFormat });
    } catch {
      setTimeFormat(previousTimeFormat);
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Common.UnknownError"),
      });
    }
  };

  const handleReminderSendHourChange = async (nextReminderSendHour: string) => {
    const normalizedReminderSendHour = normalizeReminderHour(nextReminderSendHour);

    if (normalizedReminderSendHour === reminderSendHour) {
      return;
    }

    const previousReminderSendHour = reminderSendHour;
    setReminderSendHour(normalizedReminderSendHour);

    try {
      await updateSettings({ reminderSendHour: normalizedReminderSendHour });
    } catch {
      setReminderSendHour(previousReminderSendHour);
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.Common.UnknownError"),
      });
    }
  };

  return (
    <>
      <StackNavBar
        variant="elevated"
        title={t("MobileApp.Settings.LanguageAndTime")}
        onBack={() => router.back()}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <SettingsAsyncState
          isLoading={isLoading}
          errorTitle={t("MobileApp.Settings.LanguageLoadErrorTitle")}
          errorDescription={loadError}
          loadingMinHeight={120}
          onRetry={() => {
            void loadSettings();
          }}
        >
          <>
            <SettingsFieldLabel>{t("MobileApp.Settings.LanguageSelectLabel")}</SettingsFieldLabel>
            <SettingsSelect
              label={t("MobileApp.Settings.LanguageSelectLabel")}
              options={localeOptions}
              value={locale}
              onValueChange={(nextLocale) => {
                void handleLocaleChange(nextLocale as MobileLocale);
              }}
            />

            <SettingsFieldLabel>{t("MobileApp.Settings.TimezoneSelectLabel")}</SettingsFieldLabel>
            <SettingsSelect
              label={t("MobileApp.Settings.TimezoneSelectLabel")}
              options={timezoneOptions}
              value={timezone}
              searchable
              searchPlaceholder={t("SettingsPage.Profile.TimezoneSearch")}
              emptySearchLabel={t("Addresses.NoResults")}
              onValueChange={(nextTimezone) => {
                void handleTimezoneChange(nextTimezone);
              }}
            />

            <SettingsFieldLabel>{t("MobileApp.Settings.TimeFormatSelectLabel")}</SettingsFieldLabel>
            <SettingsSelect
              label={t("MobileApp.Settings.TimeFormatSelectLabel")}
              options={timeFormatOptions}
              value={timeFormat}
              onValueChange={(nextTimeFormat) => {
                void handleTimeFormatChange(nextTimeFormat as TimeFormatValue);
              }}
            />

            <SettingsFieldLabel>{t("SettingsPage.Preferences.ReminderTime")}</SettingsFieldLabel>
            <SettingsFieldHint>
              {t("SettingsPage.Preferences.ReminderTimeDescription")}
            </SettingsFieldHint>
            <SettingsSelect
              label={t("SettingsPage.Preferences.ReminderTime")}
              leadingIcon={<IconBell size={18} stroke={colors.iconSecondary} />}
              options={reminderHourOptions}
              value={reminderSendHour}
              onValueChange={(nextReminderSendHour) => {
                void handleReminderSendHourChange(nextReminderSendHour);
              }}
            />
          </>
        </SettingsAsyncState>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    gap: 16,
  },
  flag: {
    fontSize: 18,
    lineHeight: 20,
  },
  offsetLabel: {
    fontSize: 12,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
    fontVariant: ["tabular-nums"],
  },
});
