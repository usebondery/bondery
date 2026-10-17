import { SOCIAL_LINKS } from "@bondery/helpers/globals/paths";
import { IconBrandGithub, IconWorld } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { NavLink } from "../../components/ui/NavLink";
import { Paper } from "../../components/ui/Paper";
import { Stack } from "../../components/ui/Stack";
import { ThemeIcon } from "../../components/ui/ThemeIcon";
import { WEBSITE_URL } from "../../lib/config";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { openExternalUrl } from "./openExternalUrl";

export function SettingsAboutScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const _t = useCommonTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const websiteLabel = tMobileSettings("Website");
  const repositoryLabel = tMobileSettings("Repository");
  const externalHint = tMobileSettings("External");

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("AboutUs")}
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
        <Stack>
          <Paper withBorder>
            <NavLink
              accessibilityLabel={`${websiteLabel}. ${externalHint}`}
              external
              label={websiteLabel}
              leftSection={
                <ThemeIcon>
                  <IconWorld size={18} stroke={colors.iconPrimary} />
                </ThemeIcon>
              }
              onPress={() => {
                void openExternalUrl(WEBSITE_URL);
              }}
            />
            <NavLink
              accessibilityLabel={`${repositoryLabel}. ${externalHint}`}
              external
              label={repositoryLabel}
              leftSection={
                <ThemeIcon>
                  <IconBrandGithub size={18} stroke={colors.iconPrimary} />
                </ThemeIcon>
              }
              onPress={() => {
                void openExternalUrl(SOCIAL_LINKS.github);
              }}
              withDivider={false}
            />
          </Paper>
        </Stack>
      </ScrollView>
    </>
  );
}
