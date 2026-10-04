"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { isOAuthProviderEnabled } from "@bondery/helpers/auth/oauth-providers";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrowser,
  IconDeviceDesktop,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import { detectBonderyChromeExtension } from "@/lib/extension/detectBonderyChromeExtension";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { INTEGRATION_PROVIDERS } from "@/lib/platform/config";
import {
  openUnlinkProviderConfirm,
  providerKeyFor,
  runLinkSocialProvider,
} from "../../settingsAuthActions";
import { openChromeExtensionModal } from "../modals/openChromeExtensionModal";
import { openPwaInstallModal } from "../modals/openPwaInstallModal";
import { IntegrationCard } from "./IntegrationCard";

interface UserIdentity {
  id: string;
  identity_id: string;
  provider: string;
  user_id: string;
}

interface ProviderIntegrationsProps {
  description?: string;
  hideTitle?: boolean;
  oauthProviders?: OAuthProvidersBitmap | null;
  providers: string[];
  showExtensionProvider?: boolean;
  showOAuthProviders?: boolean;
  showPWAProvider?: boolean;
  title?: string;
  userIdentities: UserIdentity[];
}

export function ProviderIntegrations({
  providers: initialProviders,
  userIdentities,
  oauthProviders = null,
  showOAuthProviders = true,
  showExtensionProvider = true,
  showPWAProvider = true,
  hideTitle = false,
  title,
  description,
}: ProviderIntegrationsProps) {
  const [providers, setProviders] = useState<string[]>(initialProviders);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  const { isChromiumDesktop, isPWAInstalled, isInstalledFromBrowser, install } = usePWAInstall();

  const t = useSettingsPageTranslations("Profile");
  const tIntegration = useSettingsPageTranslations("Integration");
  const tCommon = useCommonTranslations();

  useEffect(() => {
    let isMounted = true;

    void detectBonderyChromeExtension().then((result) => {
      if (!isMounted) {
        return;
      }

      setIsExtensionInstalled(result.state === "installed");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const linkProvider = async (provider: "github" | "linkedin") => {
    const purpose = provider === "github" ? "link_github" : "link_linkedin";
    const stepped = await ensureFreshIdentity({ purpose });
    if (stepped !== "fresh") {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: tIntegration("Connecting", {
          provider: provider === "github" ? "GitHub" : "LinkedIn",
        }),
        title: tIntegration("LinkingAccount"),
      }),
    });

    try {
      await runLinkSocialProvider(provider);
    } catch (error) {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: getAuthUserFacingError(error, tCommon),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    }
  };

  const handleUnlinkClick = async (provider: "github" | "linkedin") => {
    if (providers.length <= 1) {
      notifications.show(
        errorNotificationTemplate({
          description: tIntegration("MustHaveOneMethod"),
          title: tIntegration("CannotUnlink"),
        }),
      );
      return;
    }

    const purpose = provider === "github" ? "unlink_github" : "unlink_linkedin";
    const stepped = await ensureFreshIdentity({ purpose });
    if (stepped !== "fresh") {
      return;
    }

    openUnlinkProviderConfirm({
      displayName: provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn"),
      identities: userIdentities,
      onUnlinked: (unlinked) => {
        setProviders((prev) =>
          prev.filter((p) => {
            if (p === unlinked || p === providerKeyFor(unlinked)) {
              return false;
            }
            return !(unlinked === "linkedin" && p === "linkedin_oidc");
          }),
        );
        notifications.show(
          successNotificationTemplate({
            description: tIntegration("UnlinkSuccess", { provider: unlinked }),
            title: t("UpdateSuccess"),
          }),
        );
      },
      provider,
      t,
      tCommon,
    });
  };

  return (
    <Stack gap="md">
      <div>
        {hideTitle ? null : (
          <Text fw={500} mb={4} size="sm">
            {title || t("ConnectedAccounts")}
          </Text>
        )}
        <Text c="dimmed" mb={hideTitle ? 0 : undefined} size="xs">
          {description || t("ConnectedAccountsDescription")}
        </Text>
      </div>
      <Group gap="md">
        {showOAuthProviders
          ? INTEGRATION_PROVIDERS.map(({ provider, providerKey, iconColor }) => {
              const icon = provider === "github" ? IconBrandGithub : IconBrandLinkedin;
              const displayName =
                provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn");
              const isConnected =
                providers.includes(provider) ||
                providers.includes(providerKey) ||
                (provider === "linkedin" && providers.includes("linkedin_oidc"));
              const lastProviderCannotUnlink = isConnected && providers.length === 1;
              const canLink = isOAuthProviderEnabled(oauthProviders, provider);
              const cannotLink = !isConnected && !canLink;
              const isDisabled = lastProviderCannotUnlink || cannotLink;
              const disabledDescription = lastProviderCannotUnlink
                ? tIntegration("LinkedButCannotUnlink")
                : cannotLink
                  ? tIntegration("ProviderUnavailable", { provider: displayName })
                  : undefined;

              return (
                <IntegrationCard
                  badgeLabel={
                    isConnected ? tIntegration("Connected") : tIntegration("NotConnected")
                  }
                  displayName={displayName}
                  icon={icon}
                  iconColor={iconColor}
                  isConnected={isConnected}
                  isDisabled={isDisabled}
                  key={provider}
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    if (isConnected) {
                      void handleUnlinkClick(provider);
                    } else {
                      void linkProvider(provider);
                    }
                  }}
                  provider={provider}
                  tooltip={
                    disabledDescription ??
                    (isConnected
                      ? tIntegration("ClickToUnlink", { provider: displayName })
                      : tIntegration("ClickToLink", { provider: displayName }))
                  }
                />
              );
            })
          : null}
        {showExtensionProvider ? (
          <IntegrationCard
            badgeLabel={
              isExtensionInstalled ? tIntegration("Installed") : tIntegration("NotInstalled")
            }
            displayName={tIntegration("BrowserExtension")}
            icon={IconBrowser}
            iconColor="grape"
            isConnected={isExtensionInstalled}
            isDisabled={isExtensionInstalled}
            isLinkable={false}
            onClick={() => {
              if (isExtensionInstalled) {
                return;
              }

              openChromeExtensionModal();
            }}
            provider="bondery_chrome_extension"
          />
        ) : null}
        {showPWAProvider
          ? (() => {
              const isInstalled = isPWAInstalled || isInstalledFromBrowser;

              return (
                <IntegrationCard
                  badgeLabel={
                    isInstalled ? tIntegration("Installed") : tIntegration("NotInstalled")
                  }
                  displayName={tIntegration("DesktopApp")}
                  icon={IconDeviceDesktop}
                  iconColor="grape"
                  isConnected={isInstalled}
                  isDisabled={isInstalled}
                  isLinkable={false}
                  onClick={() => {
                    if (isInstalled) {
                      return;
                    }

                    openPwaInstallModal({ install, isChromiumDesktop });
                  }}
                  provider="pwa"
                />
              );
            })()
          : null}
      </Group>
    </Stack>
  );
}
