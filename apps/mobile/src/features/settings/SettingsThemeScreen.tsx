import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { updateSettings } from "../../lib/api/client";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import type {
  MobilePreferencesState,
  ThemePreference,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TEXT_STYLES } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
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
      icon: <IconSettings size={16} stroke={iconStroke} />,
      label: t("ThemeMatchSystem", { ns: "MobileSettings" }),
      value: "system",
    },
    {
      icon: <IconSun size={16} stroke={iconStroke} />,
      label: t("ThemeLight", { ns: "MobileSettings" }),
      value: "light",
    },
    {
      icon: <IconMoon size={16} stroke={iconStroke} />,
      label: t("ThemeDark", { ns: "MobileSettings" }),
      value: "dark",
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
        colorScheme: nextThemePreference === "system" ? "auto" : nextThemePreference,
      });
    } catch {
      setThemePreference(previousThemePreference);
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
        title={t("Theme", { ns: "MobileSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t("Theme", { ns: "MobileSettings" })}
        </Text>
        <SettingsSelect
          label={t("Theme", { ns: "MobileSettings" })}
          onValueChange={(nextThemePreference) => {
            void handleThemeChange(nextThemePreference as ThemePreference);
          }}
          options={themeOptions}
          value={themePreference}
        />
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
  label: {
    marginBottom: -8,
    marginTop: 4,
    ...MOBILE_TEXT_STYLES.fieldLabel,
  },
  screen: {
    flex: 1,
  },
});
