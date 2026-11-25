import { detachPromise } from "@bondery/helpers/async";
import { CHANGELOG_URL, HELP_DOCS_URL } from "@bondery/helpers/globals/paths";
import { IconBook, IconClipboardList } from "@tabler/icons-react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { StackNavBar, useScrollBottomInset } from "../../components/chrome";
import { NavLink } from "../../components/ui/NavLink";
import { Paper } from "../../components/ui/Paper";
import { Stack } from "../../components/ui/Stack";
import { ThemeIcon } from "../../components/ui/ThemeIcon";
import { API_URL } from "../../lib/config";
import { useMobileSettingsTranslations } from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import { notifications } from "../../lib/toast/notifications";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsReadOnlyField } from "./components/SettingsReadOnlyField";
import { useApiServerStatus } from "./hooks/useApiServerStatus";
import { useAppVersionStatus } from "./hooks/useAppVersionStatus";
import { openExternalUrl } from "./openExternalUrl";

const OFFLINE_STATUS_DOT_COLOR = "#ca8a04";

const APP_VERSION = Constants.expoConfig?.version ?? "—";

export function SettingsTechnicalScreen() {
  const tMobileSettings = useMobileSettingsTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const scrollBottomInset = useScrollBottomInset("stack");
  const { status: apiServerStatus, isChecking, refresh } = useApiServerStatus();
  const {
    status: appVersionStatus,
    isChecking: isAppVersionChecking,
    latestVersion,
    refresh: refreshAppVersion,
  } = useAppVersionStatus(APP_VERSION);
  const changelogLabel = tMobileSettings("Changelog");
  const docsLabel = tMobileSettings("Docs");
  const externalHint = tMobileSettings("External");

  const openDocs = () => {
    detachPromise(
      openExternalUrl(HELP_DOCS_URL, () => {
        notifications.show({
          message: tMobileSettings("OpenDocsErrorDescription"),
          title: tMobileSettings("OpenDocsErrorHeadline"),
          type: "error",
        });
      }),
    );
  };

  const resolveServerStatusDescription = () => {
    if (apiServerStatus === "connected") {
      return tMobileSettings("ServerStatusConnected");
    }
    if (apiServerStatus === "offline") {
      return tMobileSettings("ServerStatusOffline");
    }
    if (apiServerStatus === "unreachable") {
      return tMobileSettings("ServerStatusUnreachable");
    }
    return tMobileSettings("ServerStatusChecking");
  };
  const serverStatusDescription = resolveServerStatusDescription();

  const resolveServerStatusDotColor = () => {
    if (apiServerStatus === "connected") {
      return colors.successAccent;
    }
    if (apiServerStatus === "offline") {
      return OFFLINE_STATUS_DOT_COLOR;
    }
    if (apiServerStatus === "unreachable") {
      return colors.dangerAccent;
    }
    return colors.textMuted;
  };
  const serverStatusDotColor = resolveServerStatusDotColor();

  const resolveAppVersionDescription = () => {
    if (appVersionStatus === "latest") {
      return tMobileSettings("AppVersionLatest");
    }
    if (appVersionStatus === "outdated") {
      return tMobileSettings("AppVersionUpdateAvailable", { version: latestVersion ?? "" });
    }
    if (appVersionStatus === "offline") {
      return tMobileSettings("ServerStatusOffline");
    }
    if (appVersionStatus === "unreachable") {
      return tMobileSettings("AppVersionCheckFailed");
    }
    return tMobileSettings("AppVersionChecking");
  };
  const appVersionDescription = resolveAppVersionDescription();

  const resolveAppVersionDotColor = () => {
    if (appVersionStatus === "latest") {
      return colors.successAccent;
    }
    if (appVersionStatus === "offline" || appVersionStatus === "outdated") {
      return OFFLINE_STATUS_DOT_COLOR;
    }
    if (appVersionStatus === "unreachable") {
      return colors.dangerAccent;
    }
    return colors.textMuted;
  };
  const appVersionDotColor = resolveAppVersionDotColor();

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("Technical")}
        variant="elevated"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: scrollBottomInset,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
        style={{ backgroundColor: colors.appBackground }}
      >
        <Stack gap="lg">
          <Paper withBorder>
            <NavLink
              accessibilityLabel={`${changelogLabel}. ${externalHint}`}
              external
              label={changelogLabel}
              leftSection={
                <ThemeIcon>
                  <IconClipboardList size={18} stroke={colors.iconPrimary} />
                </ThemeIcon>
              }
              onPress={() => {
                detachPromise(openExternalUrl(CHANGELOG_URL));
              }}
            />
            <NavLink
              accessibilityLabel={`${docsLabel}. ${externalHint}`}
              external
              label={docsLabel}
              leftSection={
                <ThemeIcon>
                  <IconBook size={18} stroke={colors.iconPrimary} />
                </ThemeIcon>
              }
              onPress={openDocs}
              withDivider={false}
            />
          </Paper>

          <SettingsReadOnlyField
            label={tMobileSettings("ApiServerUrl")}
            loading={isChecking}
            onReload={() => {
              detachPromise(refresh());
            }}
            reloadAccessibilityLabel={tMobileSettings("RecheckConnection")}
            statusDotColor={serverStatusDotColor}
            statusMessage={serverStatusDescription}
            value={API_URL || tMobileSettings("ApiServerNotConfigured")}
          />

          <SettingsReadOnlyField
            label={tMobileSettings("AppVersion")}
            loading={isAppVersionChecking}
            onReload={() => {
              detachPromise(refreshAppVersion());
            }}
            reloadAccessibilityLabel={tMobileSettings("RecheckAppVersion")}
            statusDotColor={appVersionDotColor}
            statusMessage={appVersionDescription}
            value={APP_VERSION}
          />
        </Stack>
      </ScrollView>
    </>
  );
}
