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
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { Select } from "../../components/ui/Select";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { fetchSettings, updateSettings } from "../../lib/api/client";
import { resolveDisplayedError } from "../../lib/api/resolveDisplayedError";
import {
  useCommonTranslations,
  useLanguagesTranslations,
  useMobileSettingsTranslations,
  useSettingsPageTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import type {
  MobileLocale,
  MobilePreferencesState,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { syncEffectState } from "../../lib/react/syncEffectState";
import { useShowErrorToast } from "../../lib/toast/useShowErrorToast";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsAsyncState } from "./components/SettingsAsyncState";

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
  const tMobileSettings = useMobileSettingsTranslations();
  const tSettingsPage = useSettingsPageTranslations();
  const t = useCommonTranslations();
  const router = useRouter();
  const tLanguages = useLanguagesTranslations();
  const showErrorToast = useShowErrorToast();
  const colors = useMobileThemeColors();

  const locale = useMobilePreferences((state: MobilePreferencesState) => state.locale);
  const setLocale = useMobilePreferences((state: MobilePreferencesState) => state.setLocale);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string>(getDeviceTimezone());
  const [timeFormat, setTimeFormat] = useState<TimeFormatValue>("24h");
  const [reminderSendHour, setReminderSendHour] = useState<ReminderHourValue>("08:00:00");

  async function loadSettings() {
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
      setLoadError(resolveDisplayedError(err, t));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    syncEffectState(() => {
      void loadSettings();
    });
  }, []);

  const localeOptions = APP_LANGUAGES_DATA.map((language) => ({
    label: formatAppLanguagePickerLabel((key) => tLanguages(key as never), language),
    leftSection: (
      <Text className="text-[18px] leading-5" size={null}>
        {countryCodeToFlagEmoji(language.flag)}
      </Text>
    ),
    value: language.value as MobileLocale,
  }));

  const timezoneOptions = getTimezoneSelectOptions(timezone).map((timezoneOption) => ({
    label: timezoneOption.label,
    leftSection: (
      <Text c="muted" className="font-semibold" size="xs" style={{ fontVariant: ["tabular-nums"] }}>
        {timezoneOption.offsetLabel}
      </Text>
    ),
    rightSection: (
      <Text className="text-[18px] leading-5" size={null}>
        {countryCodeToFlagEmoji(timezoneOption.flag)}
      </Text>
    ),
    searchKeywords: `${timezoneOption.value} ${timezoneOption.offsetLabel}`,
    value: timezoneOption.value,
  }));

  const timeFormatOptions: Array<{ value: TimeFormatValue; label: string }> = [
    {
      label: tMobileSettings("TimeFormat24h"),
      value: "24h",
    },
    {
      label: tMobileSettings("TimeFormat12h"),
      value: "12h",
    },
  ];

  const reminderHourOptions = Array.from({ length: 24 }, (_, hour) => ({
    label: formatReminderHourLabel(hour, timeFormat),
    value: `${String(hour).padStart(2, "0")}:00:00` as ReminderHourValue,
  }));

  const handleLocaleChange = async (nextLocale: MobileLocale) => {
    if (nextLocale === locale) {
      return;
    }

    const previousLocale = locale;
    setLocale(nextLocale);

    try {
      await updateSettings({ language: nextLocale });
    } catch (err) {
      setLocale(previousLocale);
      showErrorToast(err);
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
    } catch (err) {
      setTimezone(previousTimezone);
      showErrorToast(err);
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
    } catch (err) {
      setTimeFormat(previousTimeFormat);
      showErrorToast(err);
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
    } catch (err) {
      setReminderSendHour(previousReminderSendHour);
      showErrorToast(err);
    }
  };

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("LanguageAndTime")}
        variant="elevated"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
        style={{ backgroundColor: colors.appBackground }}
      >
        <SettingsAsyncState
          errorDescription={loadError}
          errorTitle={tMobileSettings("LanguageLoadErrorTitle")}
          isLoading={isLoading}
          loadingMinHeight={120}
          onRetry={() => {
            void loadSettings();
          }}
        >
          <Stack gap="lg">
            <Select
              data={localeOptions}
              label={tMobileSettings("LanguageSelectLabel")}
              onChange={(nextLocale) => {
                void handleLocaleChange(nextLocale);
              }}
              value={locale}
            />

            <Select
              data={timezoneOptions}
              emptySearchLabel={t("feedback.noResults")}
              label={tMobileSettings("TimezoneSelectLabel")}
              onChange={(nextTimezone) => {
                void handleTimezoneChange(nextTimezone);
              }}
              searchable="auto"
              searchPlaceholder={tSettingsPage("Profile.TimezoneSearch")}
              value={timezone}
            />

            <Select
              data={timeFormatOptions}
              label={tMobileSettings("TimeFormatSelectLabel")}
              onChange={(nextTimeFormat) => {
                void handleTimeFormatChange(nextTimeFormat);
              }}
              value={timeFormat}
            />

            <Select
              data={reminderHourOptions}
              description={tSettingsPage("Preferences.ReminderTimeDescription")}
              label={tSettingsPage("Preferences.ReminderTime")}
              leadingIcon={<IconBell size={18} stroke={colors.iconSecondary} />}
              onChange={(nextReminderSendHour) => {
                void handleReminderSendHourChange(nextReminderSendHour);
              }}
              value={reminderSendHour}
            />
          </Stack>
        </SettingsAsyncState>
      </ScrollView>
    </>
  );
}
