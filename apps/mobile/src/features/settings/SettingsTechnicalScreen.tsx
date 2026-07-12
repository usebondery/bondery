import { CHANGELOG_URL, HELP_DOCS_URL } from "@bondery/helpers/globals/paths";
import { IconBook, IconClipboardList } from "@tabler/icons-react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { StackNavBar, useScrollBottomInset } from "../../components/chrome";
import { API_URL } from "../../lib/config";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsReadOnlyField } from "./components/SettingsReadOnlyField";
import { SettingsSectionCard } from "./components/SettingsSectionCard";
import { useApiServerStatus } from "./hooks/useApiServerStatus";
import { openExternalUrl } from "./openExternalUrl";

const OFFLINE_STATUS_DOT_COLOR = "#ca8a04";

const APP_VERSION = Constants.expoConfig?.version ?? "—";

export function SettingsTechnicalScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const _t = useCommonTranslations();
  const router = useRouter();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("stack");
  const { status: apiServerStatus, isChecking, refresh } = useApiServerStatus();

  const openDocs = () => {
    void openExternalUrl(HELP_DOCS_URL, () => {
      showToast({
        description: tMobileSettings("OpenDocsErrorDescription"),
        headline: tMobileSettings("OpenDocsErrorHeadline"),
        type: "error",
      });
    });
  };

  const serverStatusDescription =
    apiServerStatus === "connected"
      ? tMobileSettings("ServerStatusConnected")
      : apiServerStatus === "offline"
        ? tMobileSettings("ServerStatusOffline")
        : apiServerStatus === "unreachable"
          ? tMobileSettings("ServerStatusUnreachable")
          : tMobileSettings("ServerStatusChecking");

  const serverStatusDotColor =
    apiServerStatus === "connected"
      ? colors.successAccent
      : apiServerStatus === "offline"
        ? OFFLINE_STATUS_DOT_COLOR
        : apiServerStatus === "unreachable"
          ? colors.dangerAccent
          : colors.textMuted;

  return (
    <>
      <StackNavBar
        onBack={() => router.back()}
        title={tMobileSettings("Technical")}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomInset }]}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsSectionCard>
          <SettingsNavigationRow
            destination="external"
            externalLabel={tMobileSettings("External")}
            icon={<IconClipboardList size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Changelog")}
            onPress={() => {
              void openExternalUrl(CHANGELOG_URL);
            }}
          />

          <SettingsNavigationRow
            destination="external"
            externalLabel={tMobileSettings("External")}
            icon={<IconBook size={18} stroke={colors.iconPrimary} />}
            label={tMobileSettings("Docs")}
            onPress={openDocs}
            showDivider={false}
          />
        </SettingsSectionCard>

        <SettingsFieldLabel>{tMobileSettings("ApiServerUrl")}</SettingsFieldLabel>
        <SettingsReadOnlyField
          description={serverStatusDescription}
          loading={isChecking}
          onReload={() => {
            void refresh();
          }}
          reloadAccessibilityLabel={tMobileSettings("RecheckConnection")}
          statusDotColor={serverStatusDotColor}
          value={API_URL || tMobileSettings("ApiServerNotConfigured")}
        />

        <SettingsFieldLabel>{tMobileSettings("AppVersion")}</SettingsFieldLabel>
        <Text style={[styles.versionValue, { color: colors.textPrimary }]}>{APP_VERSION}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
  },
  screen: {
    flex: 1,
  },
  versionValue: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
});
