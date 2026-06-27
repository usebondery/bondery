import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import { updateSettings } from "../../lib/api/client";
import type {
  MobilePreferencesState,
  ThemePreference,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { StackNavBar } from "../../components/chrome";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT, MOBILE_TEXT_STYLES } from "../../theme/tokens";
import { SettingsSelect } from "./components/SettingsSelect";

export function SettingsThemeScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();

  const themePreference = useMobilePreferences(
    (state: MobilePreferencesState) => state.themePreference,
  );
  const setThemePreference = useMobilePreferences(
    (state: MobilePreferencesState) => state.setThemePreference,
  );

  const iconStroke = colors.iconSecondary;

  const themeOptions: Array<{
    value: ThemePreference;
    label: string;
    icon: ReactNode;
  }> = [
    {
      value: "system",
      label: t("MobileApp.Settings.ThemeMatchSystem"),
      icon: <IconSettings size={16} stroke={iconStroke} />,
    },
    {
      value: "light",
      label: t("MobileApp.Settings.ThemeLight"),
      icon: <IconSun size={16} stroke={iconStroke} />,
    },
    {
      value: "dark",
      label: t("MobileApp.Settings.ThemeDark"),
      icon: <IconMoon size={16} stroke={iconStroke} />,
    },
  ];

  const handleThemeChange = async (nextThemePreference: ThemePreference) => {
    if (nextThemePreference === themePreference) {
      return;
    }

    const previousThemePreference = themePreference;
    setThemePreference(nextThemePreference);

    try {
      await updateSettings({
        colorScheme:
          nextThemePreference === "system" ? "auto" : nextThemePreference,
      });
    } catch {
      setThemePreference(previousThemePreference);
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
        title={t("MobileApp.Settings.Theme")}
        onBack={() => router.back()}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t("MobileApp.Settings.Theme")}
        </Text>
        <SettingsSelect
          label={t("MobileApp.Settings.Theme")}
          options={themeOptions}
          value={themePreference}
          onValueChange={(nextThemePreference) => {
            void handleThemeChange(nextThemePreference as ThemePreference);
          }}
        />
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
  label: {
    marginTop: 4,
    marginBottom: -8,
    ...MOBILE_TEXT_STYLES.fieldLabel,
  },
});
