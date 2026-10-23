import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { IconFileText, IconShieldLock } from "@tabler/icons-react-native";
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
  useLoginPageTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { openExternalUrl } from "./openExternalUrl";

export function SettingsLegalScreen() {
  const tLoginPage = useLoginPageTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const _t = useCommonTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const privacyLabel = tLoginPage("PrivacyPolicy");
  const termsLabel = tLoginPage("TermsOfService");
  const externalHint = tMobileSettings("External");

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("Legal")}
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
              accessibilityLabel={`${privacyLabel}. ${externalHint}`}
              external
              label={privacyLabel}
              leftSection={
                <ThemeIcon>
                  <IconShieldLock size={18} stroke={colors.iconPrimary} />
                </ThemeIcon>
              }
              onPress={() => {
                void openExternalUrl(`${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`);
              }}
            />
            <NavLink
              accessibilityLabel={`${termsLabel}. ${externalHint}`}
              external
              label={termsLabel}
              leftSection={
                <ThemeIcon>
                  <IconFileText size={18} stroke={colors.iconPrimary} />
                </ThemeIcon>
              }
              onPress={() => {
                void openExternalUrl(`${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`);
              }}
              withDivider={false}
            />
          </Paper>
        </Stack>
      </ScrollView>
    </>
  );
}
