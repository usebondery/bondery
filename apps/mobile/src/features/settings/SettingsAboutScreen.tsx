import { ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { IconBrandGithub, IconWorld } from "@tabler/icons-react-native";
import { SOCIAL_LINKS } from "@bondery/helpers/globals/paths";
import { StackNavBar } from "../../components/chrome";
import { WEBSITE_URL } from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { openExternalUrl } from "./openExternalUrl";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsSectionCard } from "./components/SettingsSectionCard";

export function SettingsAboutScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  return (
    <>
      <StackNavBar
        variant="elevated"
        title={t("MobileApp.Settings.AboutUs")}
        onBack={() => router.back()}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <SettingsSectionCard>
          <SettingsNavigationRow
            icon={<IconWorld size={18} stroke={colors.iconPrimary} />}
            label={t("MobileApp.Settings.Website")}
            destination="external"
            externalLabel={t("MobileApp.Settings.External")}
            onPress={() => {
              void openExternalUrl(WEBSITE_URL);
            }}
          />

          <SettingsNavigationRow
            icon={<IconBrandGithub size={18} stroke={colors.iconPrimary} />}
            label={t("MobileApp.Settings.Repository")}
            destination="external"
            externalLabel={t("MobileApp.Settings.External")}
            showDivider={false}
            onPress={() => {
              void openExternalUrl(SOCIAL_LINKS.github);
            }}
          />
        </SettingsSectionCard>
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
});
