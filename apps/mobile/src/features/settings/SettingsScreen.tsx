import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconBook,
  IconInfoCircle,
  IconMessage,
  IconServer,
  IconSettings,
  IconShield,
  IconSun,
  IconTag,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react-native";
import { HELP_DOCS_URL, SOCIAL_LINKS } from "@bondery/helpers/globals/paths";
import { TabRootLargeTitle, TabRootScreenHeader, useScrollBottomInset } from "../../components/chrome";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { useFabSpeedDialScrollDismiss } from "../navigation/useFabSpeedDialScrollDismiss";
import { SOCIAL_BRAND_COLORS } from "../../theme/colors";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactSocialButton } from "../contacts/components/ContactSocialButton";
import { openExternalUrl } from "./openExternalUrl";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsSectionCard } from "./components/SettingsSectionCard";

const SOCIAL_BUTTONS = [
  {
    id: "github",
    labelKey: "MobileApp.Settings.OpenGitHub",
    url: SOCIAL_LINKS.github,
    color: SOCIAL_BRAND_COLORS.github,
    icon: IconBrandGithub,
  },
  {
    id: "linkedin",
    labelKey: "MobileApp.Settings.OpenLinkedIn",
    url: SOCIAL_LINKS.linkedin,
    color: SOCIAL_BRAND_COLORS.linkedin,
    icon: IconBrandLinkedin,
  },
  {
    id: "reddit",
    labelKey: "MobileApp.Settings.OpenReddit",
    url: SOCIAL_LINKS.reddit,
    color: SOCIAL_BRAND_COLORS.reddit,
    icon: IconBrandReddit,
  },
  {
    id: "x",
    labelKey: "MobileApp.Settings.OpenX",
    url: SOCIAL_LINKS.x,
    color: SOCIAL_BRAND_COLORS.x,
    icon: IconBrandX,
  },
  {
    id: "discord",
    labelKey: "MobileApp.Settings.OpenDiscord",
    url: SOCIAL_LINKS.discord,
    color: SOCIAL_BRAND_COLORS.discord,
    icon: IconBrandDiscord,
  },
] as const;

export function SettingsScreen() {
  const t = useMobileTranslations();
  const router = useRouter();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");
  const { onScroll: fabScrollDismiss } = useFabSpeedDialScrollDismiss();

  const openDocs = () => {
    void openExternalUrl(HELP_DOCS_URL, () => {
      showToast({
        type: "error",
        headline: t("MobileApp.Settings.OpenDocsErrorHeadline"),
        description: t("MobileApp.Settings.OpenDocsErrorDescription"),
      });
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <TabRootScreenHeader
        titleRow={<TabRootLargeTitle>{t("MobileApp.Settings.Title")}</TabRootLargeTitle>}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollBottomInset },
        ]}
        onScroll={fabScrollDismiss}
        scrollEventThrottle={16}
      >
      <SettingsSectionCard title={t("MobileApp.Settings.Account")}>
        <SettingsNavigationRow
          icon={<IconSettings size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.Account")}
          onPress={() => router.push("/settings/account")}
        />
      </SettingsSectionCard>

      <SettingsSectionCard title={t("MobileApp.Settings.Preferences")}>
        <SettingsNavigationRow
          icon={<IconMessage size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.SwipeActions")}
          onPress={() => router.push("/settings/swipe-actions")}
        />

        <SettingsNavigationRow
          icon={<IconUsers size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.GroupSort")}
          onPress={() => router.push("/settings/group-sort")}
        />

        <SettingsNavigationRow
          icon={<IconTag size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.TagsSettings.Title")}
          onPress={() => router.push("/settings/tags")}
        />

        <SettingsNavigationRow
          icon={<IconWorld size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.LanguageAndTime")}
          onPress={() => router.push("/settings/language")}
        />

        <SettingsNavigationRow
          icon={<IconSun size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.Theme")}
          showDivider={false}
          onPress={() => router.push("/settings/theme")}
        />
      </SettingsSectionCard>

      <SettingsSectionCard title={t("MobileApp.Settings.Links")}>
        <SettingsNavigationRow
          icon={<IconBook size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.Guides")}
          destination="external"
          externalLabel={t("MobileApp.Settings.External")}
          onPress={openDocs}
        />

        <SettingsNavigationRow
          icon={<IconInfoCircle size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.AboutUs")}
          onPress={() => router.push("/settings/about")}
        />

        <SettingsNavigationRow
          icon={<IconShield size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.Legal")}
          showDivider={false}
          onPress={() => router.push("/settings/legal")}
        />
      </SettingsSectionCard>

      <SettingsSectionCard title={t("MobileApp.Settings.FollowUs")}>
        <View style={styles.socialsRow}>
          {SOCIAL_BUTTONS.map((social) => {
            const Icon = social.icon;

            return (
              <ContactSocialButton
                key={social.id}
                color={social.color}
                icon={<Icon size={20} stroke={social.color} />}
                accessibilityLabel={t(social.labelKey)}
                onPress={() => {
                  void openExternalUrl(social.url);
                }}
              />
            );
          })}
        </View>
      </SettingsSectionCard>

      <SettingsSectionCard title={t("MobileApp.Settings.Technical")}>
        <SettingsNavigationRow
          icon={<IconServer size={18} stroke={colors.iconPrimary} />}
          label={t("MobileApp.Settings.Technical")}
          showDivider={false}
          onPress={() => router.push("/settings/technical")}
        />
      </SettingsSectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    gap: 16,
  },
  socialsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
