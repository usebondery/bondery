import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { IconBook, IconClipboardList } from "@tabler/icons-react-native";
import { CHANGELOG_URL, HELP_DOCS_URL } from "@bondery/helpers/globals/paths";
import { StackNavBar, useScrollBottomInset } from "../../components/chrome";
import { API_URL } from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../lib/toast/useAppToast";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { openExternalUrl } from "./openExternalUrl";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsNavigationRow } from "./components/SettingsNavigationRow";
import { SettingsReadOnlyField } from "./components/SettingsReadOnlyField";
import { SettingsSectionCard } from "./components/SettingsSectionCard";
import { useApiServerStatus } from "./hooks/useApiServerStatus";

const OFFLINE_STATUS_DOT_COLOR = "#ca8a04";

const APP_VERSION = Constants.expoConfig?.version ?? "—";

export function SettingsTechnicalScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("stack");
  const { status: apiServerStatus, isChecking, refresh } = useApiServerStatus();

  const openDocs = () => {
    void openExternalUrl(HELP_DOCS_URL, () => {
      showToast({
        type: "error",
        headline: t("MobileApp.Settings.OpenDocsErrorHeadline"),
        description: t("MobileApp.Settings.OpenDocsErrorDescription"),
      });
    });
  };

  const serverStatusDescription =
    apiServerStatus === "connected"
      ? t("MobileApp.Settings.ServerStatusConnected")
      : apiServerStatus === "offline"
        ? t("MobileApp.Settings.ServerStatusOffline")
        : apiServerStatus === "unreachable"
          ? t("MobileApp.Settings.ServerStatusUnreachable")
          : t("MobileApp.Settings.ServerStatusChecking");

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
        variant="elevated"
        title={t("MobileApp.Settings.Technical")}
        onBack={() => router.back()}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollBottomInset },
        ]}
      >
        <SettingsSectionCard>
          <SettingsNavigationRow
            icon={<IconClipboardList size={18} stroke={colors.iconPrimary} />}
            label={t("MobileApp.Settings.Changelog")}
            destination="external"
            externalLabel={t("MobileApp.Settings.External")}
            onPress={() => {
              void openExternalUrl(CHANGELOG_URL);
            }}
          />

          <SettingsNavigationRow
            icon={<IconBook size={18} stroke={colors.iconPrimary} />}
            label={t("MobileApp.Settings.Docs")}
            destination="external"
            externalLabel={t("MobileApp.Settings.External")}
            showDivider={false}
            onPress={openDocs}
          />
        </SettingsSectionCard>

        <SettingsFieldLabel>{t("MobileApp.Settings.ApiServerUrl")}</SettingsFieldLabel>
        <SettingsReadOnlyField
          value={API_URL || t("MobileApp.Settings.ApiServerNotConfigured")}
          description={serverStatusDescription}
          statusDotColor={serverStatusDotColor}
          loading={isChecking}
          onReload={() => {
            void refresh();
          }}
          reloadAccessibilityLabel={t("MobileApp.Settings.RecheckConnection")}
        />

        <SettingsFieldLabel>{t("MobileApp.Settings.AppVersion")}</SettingsFieldLabel>
        <Text style={[styles.versionValue, { color: colors.textPrimary }]}>
          {APP_VERSION}
        </Text>
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
    gap: 16,
  },
  versionValue: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
});
