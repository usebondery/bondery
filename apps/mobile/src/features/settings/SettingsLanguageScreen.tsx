import {
  APP_LANGUAGES_DATA,
  countryCodeToFlagEmoji,
  formatAppLanguagePickerLabel,
  getDeviceTimezone,
  getTimezoneSelectOptions,
  resolveToCanonicalTimezone,
} from "@bondery/helpers/locale";
import { coerceSupportedLocale } from "@bondery/translations";
import { IconBell } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { fetchSettings, updateSettings } from "../../lib/api/client";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import type {
  MobileLocale,
  MobilePreferencesState,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsAsyncState } from "./components/SettingsAsyncState";
import { SettingsFieldHint } from "./components/SettingsFieldHint";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsSelect } from "./components/SettingsSelect";

type TimeFormatValue = "24h" | "12h";
type ReminderHourValue = `${string}:00:00`;

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
  const tLanguages = useMobileTranslations("Languages");
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();

  const locale = useMobilePreferences((state: MobilePreferencesState) => state.locale);
  const setLocale = useMobilePreferences((state: MobilePreferencesState) => state.setLocale);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(getDeviceTimezone());
  const [timeFormat, setTimeFormat] = useState<TimeFormatValue>("24h");
  const [reminderSendHour, setReminderSendHour] = useState<ReminderHourValue>("08:00:00");

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetchSettings();

      const nextLanguage = coerceSupportedLocale(response.data.language);
      const nextTimezone = resolveToCanonicalTimezone(
        response.data.timezone || getDeviceTimezone(),
      );
      const nextTimeFormat: TimeFormatValue = response.data.timeFormat === "12h" ? "12h" : "24h";

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
          : t("LanguageLoadErrorDescription", { ns: "MobileSettings" }),
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
        label: formatAppLanguagePickerLabel(tLanguages, language),
        leftSection: <Text style={styles.flag}>{countryCodeToFlagEmoji(language.flag)}</Text>,
        value: language.value as MobileLocale,
      })),
    [tLanguages],
  );

  const timezoneOptions = useMemo(
    () =>
      getTimezoneSelectOptions(timezone).map((timezoneOption) => ({
        label: timezoneOption.label,
        leftSection: (
          <Text style={[styles.offsetLabel, { color: colors.textMuted }]}>
            {timezoneOption.offsetLabel}
          </Text>
        ),
        rightSection: (
          <Text style={styles.flag}>{countryCodeToFlagEmoji(timezoneOption.flag)}</Text>
        ),
        searchKeywords: `${timezoneOption.value} ${timezoneOption.offsetLabel}`,
        value: timezoneOption.value,
      })),
    [colors.textMuted, timezone],
  );

  const timeFormatOptions: Array<{ value: TimeFormatValue; label: string }> = [
    {
      label: t("TimeFormat24h", { ns: "MobileSettings" }),
      value: "24h",
    },
    {
      label: t("TimeFormat12h", { ns: "MobileSettings" }),
      value: "12h",
    },
  ];

  const reminderHourOptions = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hour) => ({
        label: formatReminderHourLabel(hour, timeFormat),
        value: `${String(hour).padStart(2, "0")}:00:00`,
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
        description: t("errors.unknown", { ns: "common" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
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
        description: t("errors.unknown", { ns: "common" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
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
        description: t("errors.unknown", { ns: "common" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
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
        description: t("errors.unknown", { ns: "common" }),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
    }
  };

  return (
    <>
      <StackNavBar
        onBack={() => router.back()}
        title={t("LanguageAndTime", { ns: "MobileSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsAsyncState
          errorDescription={loadError}
          errorTitle={t("LanguageLoadErrorTitle", { ns: "MobileSettings" })}
          isLoading={isLoading}
          loadingMinHeight={120}
          onRetry={() => {
            void loadSettings();
          }}
        >
          <SettingsFieldLabel>
            {t("LanguageSelectLabel", { ns: "MobileSettings" })}
          </SettingsFieldLabel>
          <SettingsSelect
            label={t("LanguageSelectLabel", { ns: "MobileSettings" })}
            onValueChange={(nextLocale) => {
              void handleLocaleChange(nextLocale as MobileLocale);
            }}
            options={localeOptions}
            value={locale}
          />

          <SettingsFieldLabel>
            {t("TimezoneSelectLabel", { ns: "MobileSettings" })}
          </SettingsFieldLabel>
          <SettingsSelect
            emptySearchLabel={t("feedback.noResults", { ns: "common" })}
            label={t("TimezoneSelectLabel", { ns: "MobileSettings" })}
            onValueChange={(nextTimezone) => {
              void handleTimezoneChange(nextTimezone);
            }}
            options={timezoneOptions}
            searchable
            searchPlaceholder={t("Profile.TimezoneSearch", { ns: "SettingsPage" })}
            value={timezone}
          />

          <SettingsFieldLabel>
            {t("TimeFormatSelectLabel", { ns: "MobileSettings" })}
          </SettingsFieldLabel>
          <SettingsSelect
            label={t("TimeFormatSelectLabel", { ns: "MobileSettings" })}
            onValueChange={(nextTimeFormat) => {
              void handleTimeFormatChange(nextTimeFormat as TimeFormatValue);
            }}
            options={timeFormatOptions}
            value={timeFormat}
          />

          <SettingsFieldLabel>
            {t("Preferences.ReminderTime", { ns: "SettingsPage" })}
          </SettingsFieldLabel>
          <SettingsFieldHint>
            {t("Preferences.ReminderTimeDescription", { ns: "SettingsPage" })}
          </SettingsFieldHint>
          <SettingsSelect
            label={t("Preferences.ReminderTime", { ns: "SettingsPage" })}
            leadingIcon={<IconBell size={18} stroke={colors.iconSecondary} />}
            onValueChange={(nextReminderSendHour) => {
              void handleReminderSendHourChange(nextReminderSendHour);
            }}
            options={reminderHourOptions}
            value={reminderSendHour}
          />
        </SettingsAsyncState>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
  },
  flag: {
    fontSize: 18,
    lineHeight: 20,
  },
  offsetLabel: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.semibold,
  },
  screen: {
    flex: 1,
  },
});
