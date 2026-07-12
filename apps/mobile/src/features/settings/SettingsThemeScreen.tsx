import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { updateSettings } from "../../lib/api/client";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
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
  const tMobileSettings = useMobileSettingsTranslations();
  const t = useCommonTranslations();
  const router = useRouter();
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
      label: tMobileSettings("ThemeMatchSystem"),
      value: "system",
    },
    {
      icon: <IconSun size={16} stroke={iconStroke} />,
      label: tMobileSettings("ThemeLight"),
      value: "light",
    },
    {
      icon: <IconMoon size={16} stroke={iconStroke} />,
      label: tMobileSettings("ThemeDark"),
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
        description: t("errors.unknown"),
        headline: t("feedback.errorTitle"),
        type: "error",
      });
    }
  };

  return (
    <>
      <StackNavBar
        onBack={() => router.back()}
        title={tMobileSettings("Theme")}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {tMobileSettings("Theme")}
        </Text>
        <SettingsSelect
          label={tMobileSettings("Theme")}
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
