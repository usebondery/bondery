import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { IconFileText, IconShieldLock } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { WEBSITE_URL } from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsSectionCard } from "./components/SettingsSectionCard";
import { openExternalUrl } from "./openExternalUrl";

export function SettingsLegalScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();

  return (
    <>
      <StackNavBar
        onBack={() => router.back()}
        title={t("Legal", { ns: "MobileSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsSectionCard>
          <SettingsNavigationRow
            destination="external"
            externalLabel={t("External", { ns: "MobileSettings" })}
            icon={<IconShieldLock size={18} stroke={colors.iconPrimary} />}
            label={t("PrivacyPolicy", { ns: "LoginPage" })}
            onPress={() => {
              void openExternalUrl(`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`);
            }}
          />

          <SettingsNavigationRow
            destination="external"
            externalLabel={t("External", { ns: "MobileSettings" })}
            icon={<IconFileText size={18} stroke={colors.iconPrimary} />}
            label={t("TermsOfService", { ns: "LoginPage" })}
            onPress={() => {
              void openExternalUrl(`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`);
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
