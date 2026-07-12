import { SOCIAL_LINKS } from "@bondery/helpers/globals/paths";
import { IconBrandGithub, IconWorld } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { WEBSITE_URL } from "../../lib/config";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsSectionCard } from "./components/SettingsSectionCard";
import { openExternalUrl } from "./openExternalUrl";

export function SettingsAboutScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const _t = useCommonTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();

  return (
    <>
      <StackNavBar
        onBack={() => router.back()}
        title={tMobileSettings("AboutUs")}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsSectionCard>
          <SettingsNavigationRow
            destination="external"
            externalLabel={tMobileSettings("External")}
            icon={<IconWorld size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Website")}
            onPress={() => {
              void openExternalUrl(WEBSITE_URL);
            }}
          />

          <SettingsNavigationRow
            destination="external"
            externalLabel={tMobileSettings("External")}
            icon={<IconBrandGithub size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Repository")}
            onPress={() => {
              void openExternalUrl(SOCIAL_LINKS.github);
            }}
            showDivider={false}
          />
        </SettingsSectionCard>
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
  screen: {
    flex: 1,
  },
});
