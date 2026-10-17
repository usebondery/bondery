import { HELP_DOCS_URL, SOCIAL_LINKS } from "@bondery/helpers/globals/paths";
import {
  IconBook,
  IconBrandDiscord,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconGavel,
  IconInfoCircle,
  IconMessage,
  IconServer,
  IconSettings,
  IconSun,
  IconTag,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react-native";
import { ScrollView, View } from "react-native";
import {
  TabRootLargeTitle,
  TabRootScreenHeader,
  useScrollBottomInset,
} from "../../components/chrome";
import { ActionButton } from "../../components/ui/ActionButton";
import { Group } from "../../components/ui/Group";
import { InputWrapper } from "../../components/ui/InputWrapper";
import { NavLink } from "../../components/ui/NavLink";
import { Paper } from "../../components/ui/Paper";
import { Stack } from "../../components/ui/Stack";
import { ThemeIcon } from "../../components/ui/ThemeIcon";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
  useTagsSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { notifications } from "../../lib/toast/notifications";
import { SOCIAL_BRAND_COLORS } from "../../theme/colors";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
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
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("tabRoot");

  const openDocs = () => {
    void openExternalUrl(HELP_DOCS_URL, () => {
      notifications.show({
        message: tMobileSettings("OpenDocsErrorDescription"),
        title: tMobileSettings("OpenDocsErrorHeadline"),
        type: "error",
      });
    });
  };

  const guidesLabel = tMobileSettings("Guides");

  return (
    <View className="flex-1" style={{ backgroundColor: colors.appBackground }}>
      <TabRootScreenHeader
        titleRow={<TabRootLargeTitle>{tMobileSettings("Title")}</TabRootLargeTitle>}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: scrollBottomInset,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
      >
        <Stack gap="lg">
          <InputWrapper label={tMobileSettings("Account")}>
            <Paper withBorder>
              <NavLink
                href="/settings/account"
                label={tMobileSettings("Account")}
                leftSection={
                  <ThemeIcon>
                    <IconSettings size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
                withDivider={false}
              />
            </Paper>
          </InputWrapper>

          <InputWrapper label={tMobileSettings("Preferences")}>
            <Paper withBorder>
              <NavLink
                href="/settings/swipe-actions"
                label={tMobileSettings("SwipeActions")}
                leftSection={
                  <ThemeIcon>
                    <IconMessage size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
              />
              <NavLink
                href="/settings/groups"
                label={tMobileSettings("Groups")}
                leftSection={
                  <ThemeIcon>
                    <IconUsers size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
              />
              <NavLink
                href="/settings/tags"
                label={tTagsSettings("Title")}
                leftSection={
                  <ThemeIcon>
                    <IconTag size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
              />
              <NavLink
                href="/settings/language"
                label={tMobileSettings("LanguageAndTime")}
                leftSection={
                  <ThemeIcon>
                    <IconWorld size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
              />
              <NavLink
                href="/settings/theme"
                label={tMobileSettings("Theme")}
                leftSection={
                  <ThemeIcon>
                    <IconSun size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
                withDivider={false}
              />
            </Paper>
          </InputWrapper>

          <InputWrapper label={tMobileSettings("Links")}>
            <Paper withBorder>
              <NavLink
                accessibilityLabel={`${guidesLabel}. ${tMobileSettings("External")}`}
                external
                label={guidesLabel}
                leftSection={
                  <ThemeIcon>
                    <IconBook size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
                onPress={openDocs}
              />
              <NavLink
                href="/settings/about"
                label={tMobileSettings("AboutUs")}
                leftSection={
                  <ThemeIcon>
                    <IconInfoCircle size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
              />
              <NavLink
                href="/settings/legal"
                label={tMobileSettings("Legal")}
                leftSection={
                  <ThemeIcon>
                    <IconGavel size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
                withDivider={false}
              />
            </Paper>
          </InputWrapper>

          <InputWrapper label={tMobileSettings("FollowUs")}>
            <Paper withBorder>
              <Group className="px-4 py-3.5" grow>
                {SOCIAL_BUTTONS.map((social) => {
                  const Icon = social.icon;

                  return (
                    <ActionButton
                      accessibilityLabel={tMobileSettings(social.labelKey)}
                      color={social.color}
                      key={social.id}
                      onPress={() => {
                        void openExternalUrl(social.url);
                      }}
                      size="md"
                      variant="outline"
                    >
                      <Icon size={20} stroke={social.color} />
                    </ActionButton>
                  );
                })}
              </Group>
            </Paper>
          </InputWrapper>

          <InputWrapper label={tMobileSettings("Technical")}>
            <Paper withBorder>
              <NavLink
                href="/settings/technical"
                label={tMobileSettings("Technical")}
                leftSection={
                  <ThemeIcon>
                    <IconServer size={18} stroke={colors.iconPrimary} />
                  </ThemeIcon>
                }
                withDivider={false}
              />
            </Paper>
          </InputWrapper>
        </Stack>
      </ScrollView>
    </View>
  );
}
