import { CHANGELOG_URL, HELP_DOCS_URL } from "@bondery/helpers/globals/paths";
import { IconBook, IconClipboardList } from "@tabler/icons-react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { StackNavBar, useScrollBottomInset } from "../../components/chrome";
import { API_URL } from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
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
  const router = useRouter();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("stack");
  const { status: apiServerStatus, isChecking, refresh } = useApiServerStatus();

  const openDocs = () => {
    void openExternalUrl(HELP_DOCS_URL, () => {
      showToast({
        description: t("OpenDocsErrorDescription", { ns: "MobileSettings" }),
        headline: t("OpenDocsErrorHeadline", { ns: "MobileSettings" }),
        type: "error",
      });
    });
  };

  const serverStatusDescription =
    apiServerStatus === "connected"
      ? t("ServerStatusConnected", { ns: "MobileSettings" })
      : apiServerStatus === "offline"
        ? t("ServerStatusOffline", { ns: "MobileSettings" })
        : apiServerStatus === "unreachable"
          ? t("ServerStatusUnreachable", { ns: "MobileSettings" })
          : t("ServerStatusChecking", { ns: "MobileSettings" });

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
        title={t("Technical", { ns: "MobileSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomInset }]}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsSectionCard>
          <SettingsNavigationRow
            destination="external"
            externalLabel={t("External", { ns: "MobileSettings" })}
            icon={<IconClipboardList size={18} stroke={colors.iconPrimary} />}
            label={t("Changelog", { ns: "MobileSettings" })}
            onPress={() => {
              void openExternalUrl(CHANGELOG_URL);
            }}
          />

          <SettingsNavigationRow
            destination="external"
            externalLabel={t("External", { ns: "MobileSettings" })}
            icon={<IconBook size={18} stroke={colors.iconPrimary} />}
            label={t("Docs", { ns: "MobileSettings" })}
            onPress={openDocs}
            showDivider={false}
          />
        </SettingsSectionCard>

        <SettingsFieldLabel>{t("ApiServerUrl", { ns: "MobileSettings" })}</SettingsFieldLabel>
        <SettingsReadOnlyField
          description={serverStatusDescription}
          loading={isChecking}
          onReload={() => {
            void refresh();
          }}
          reloadAccessibilityLabel={t("RecheckConnection", { ns: "MobileSettings" })}
          statusDotColor={serverStatusDotColor}
          value={API_URL || t("ApiServerNotConfigured", { ns: "MobileSettings" })}
        />

        <SettingsFieldLabel>{t("AppVersion", { ns: "MobileSettings" })}</SettingsFieldLabel>
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
