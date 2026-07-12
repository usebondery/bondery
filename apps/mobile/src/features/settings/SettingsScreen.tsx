import { HELP_DOCS_URL, SOCIAL_LINKS } from "@bondery/helpers/globals/paths";
import {
  IconBook,
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
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
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  TabRootLargeTitle,
  TabRootScreenHeader,
  useScrollBottomInset,
} from "../../components/chrome";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
  useTagsSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { preloadMobileNamespaces } from "../../lib/i18n/preloadMobileNamespaces";
import { useAppToast } from "../../lib/toast/useAppToast";
import { SOCIAL_BRAND_COLORS } from "../../theme/colors";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactSocialButton } from "../contacts/components/ContactSocialButton";
import { useFabSpeedDialScrollDismiss } from "../navigation/useFabSpeedDialScrollDismiss";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsSectionCard } from "./components/SettingsSectionCard";
import { openExternalUrl } from "./openExternalUrl";

const SOCIAL_BUTTONS = [
  {
    color: SOCIAL_BRAND_COLORS.github,
    icon: IconBrandGithub,
    id: "github",
    labelKey: "OpenGitHub",
    url: SOCIAL_LINKS.github,
  },
  {
    color: SOCIAL_BRAND_COLORS.linkedin,
    icon: IconBrandLinkedin,
    id: "linkedin",
    labelKey: "OpenLinkedIn",
    url: SOCIAL_LINKS.linkedin,
  },
  {
    color: SOCIAL_BRAND_COLORS.reddit,
    icon: IconBrandReddit,
    id: "reddit",
    labelKey: "OpenReddit",
    url: SOCIAL_LINKS.reddit,
  },
  {
    color: SOCIAL_BRAND_COLORS.x,
    icon: IconBrandX,
    id: "x",
    labelKey: "OpenX",
    url: SOCIAL_LINKS.x,
  },
  {
    color: SOCIAL_BRAND_COLORS.discord,
    icon: IconBrandDiscord,
    id: "discord",
    labelKey: "OpenDiscord",
    url: SOCIAL_LINKS.discord,
  },
] as const;

export function SettingsScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const tTagsSettings = useTagsSettingsTranslations();
  const _t = useCommonTranslations();
  useEffect(() => {
    void preloadMobileNamespaces(["mobile.settingsTab"]);
  }, []);
  const router = useRouter();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");
  const { onScroll: fabScrollDismiss } = useFabSpeedDialScrollDismiss();

  const openDocs = () => {
    void openExternalUrl(HELP_DOCS_URL, () => {
      showToast({
        description: tMobileSettings("OpenDocsErrorDescription"),
        headline: tMobileSettings("OpenDocsErrorHeadline"),
        type: "error",
      });
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBackground }]}>
      <TabRootScreenHeader
        titleRow={<TabRootLargeTitle>{tMobileSettings("Title")}</TabRootLargeTitle>}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomInset }]}
        onScroll={fabScrollDismiss}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        <SettingsSectionCard title={tMobileSettings("Account")}>
          <SettingsNavigationRow
            icon={<IconSettings size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Account")}
            onPress={() => router.push("/settings/account")}
          />
        </SettingsSectionCard>

        <SettingsSectionCard title={tMobileSettings("Preferences")}>
          <SettingsNavigationRow
            icon={<IconMessage size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("SwipeActions")}
            onPress={() => router.push("/settings/swipe-actions")}
          />

          <SettingsNavigationRow
            icon={<IconUsers size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("GroupSort")}
            onPress={() => router.push("/settings/group-sort")}
          />

          <SettingsNavigationRow
            icon={<IconTag size={18} stroke={colors.iconPrimary} />}
            label={tTagsSettings("Title")}
            onPress={() => router.push("/settings/tags")}
          />

          <SettingsNavigationRow
            icon={<IconWorld size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("LanguageAndTime")}
            onPress={() => router.push("/settings/language")}
          />

          <SettingsNavigationRow
            icon={<IconSun size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Theme")}
            onPress={() => router.push("/settings/theme")}
            showDivider={false}
          />
        </SettingsSectionCard>

        <SettingsSectionCard title={tMobileSettings("Links")}>
          <SettingsNavigationRow
            destination="external"
            externalLabel={tMobileSettings("External")}
            icon={<IconBook size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Guides")}
            onPress={openDocs}
          />

          <SettingsNavigationRow
            icon={<IconInfoCircle size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("AboutUs")}
            onPress={() => router.push("/settings/about")}
          />

          <SettingsNavigationRow
            icon={<IconShield size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Legal")}
            onPress={() => router.push("/settings/legal")}
            showDivider={false}
          />
        </SettingsSectionCard>

        <SettingsSectionCard title={tMobileSettings("FollowUs")}>
          <View style={styles.socialsRow}>
            {SOCIAL_BUTTONS.map((social) => {
              const Icon = social.icon;

              return (
                <ContactSocialButton
                  accessibilityLabel={tMobileSettings(social.labelKey)}
                  color={social.color}
                  icon={<Icon size={20} stroke={social.color} />}
                  key={social.id}
                  onPress={() => {
                    void openExternalUrl(social.url);
                  }}
                />
              );
            })}
          </View>
        </SettingsSectionCard>

        <SettingsSectionCard title={tMobileSettings("Technical")}>
          <SettingsNavigationRow
            icon={<IconServer size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Technical")}
            onPress={() => router.push("/settings/technical")}
            showDivider={false}
          />
        </SettingsSectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  socialsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
