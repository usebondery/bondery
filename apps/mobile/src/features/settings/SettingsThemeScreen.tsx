import { IconMoon, IconSettings, IconSun } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Stack } from "../../components/ui/Stack";
import { updateSettings } from "../../lib/api/client";
import { useMobileSettingsTranslations } from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import type {
  MobilePreferencesState,
  ThemePreference,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useShowErrorToast } from "../../lib/toast/useShowErrorToast";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";

export function SettingsThemeScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const router = useRouter();
  const showErrorToast = useShowErrorToast();
  const colors = useMobileThemeColors();

  const themePreference = useMobilePreferences(
    (state: MobilePreferencesState) => state.themePreference,
  );
  const setThemePreference = useMobilePreferences(
    (state: MobilePreferencesState) => state.setThemePreference,
  );

  const iconStroke = colors.iconSecondary;

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
    } catch (err) {
      setThemePreference(previousThemePreference);
      showErrorToast(err);
    }
  };

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("Theme")}
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
        <Stack gap="lg">
          <SegmentedControl
            data={[
              {
                label: tMobileSettings("ThemeMatchSystem"),
                leftSection: <IconSettings size={16} stroke={iconStroke} />,
                value: "system",
              },
              {
                label: tMobileSettings("ThemeLight"),
                leftSection: <IconSun size={16} stroke={iconStroke} />,
                value: "light",
              },
              {
                label: tMobileSettings("ThemeDark"),
                leftSection: <IconMoon size={16} stroke={iconStroke} />,
                value: "dark",
              },
            ]}
            label={tMobileSettings("Theme")}
            onChange={(nextThemePreference) => {
              void handleThemeChange(nextThemePreference);
            }}
            value={themePreference}
          />
        </Stack>
      </ScrollView>
    </>
  );
}
