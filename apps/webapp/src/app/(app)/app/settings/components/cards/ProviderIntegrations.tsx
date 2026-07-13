"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrowser,
  IconDeviceDesktop,
  IconUnlink,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { detectBonderyChromeExtension } from "@/lib/extension/detectBonderyChromeExtension";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { TypedTrans } from "@/lib/i18n/TypedTrans";
import { INTEGRATION_PROVIDERS } from "@/lib/platform/config";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import { openChromeExtensionModal } from "../modals/openChromeExtensionModal";
import { IntegrationCard } from "./IntegrationCard";

interface UserIdentity {
  id: string;
  identity_id: string;
  provider: string;
  user_id: string;
}

interface ProviderIntegrationsProps {
  description?: string;
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
  showOAuthProviders = true,
  showExtensionProvider = true,
  showPWAProvider = true,
  title,
  description,
}: ProviderIntegrationsProps) {
  const [providers, setProviders] = useState<string[]>(initialProviders);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);

  const { canInstall, isChromiumDesktop, isPWAInstalled, isInstalledFromBrowser, install } =
    usePWAInstall();

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
      setExtensionVersion(result.version);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const linkProvider = async (provider: "github" | "linkedin") => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: tIntegration("Connecting", {
          provider: provider === "github" ? "GitHub" : "LinkedIn",
        }),
        title: tIntegration("LinkingAccount"),
      }),
    });

    try {
      const supabase = createBrowswerSupabaseClient();

      const { data, error } = await supabase.auth.linkIdentity({
        provider: provider === "linkedin" ? "linkedin_oidc" : provider,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    }
  };

  const handleUnlinkClick = (provider: "github" | "linkedin") => {
    if (providers.length <= 1) {
      notifications.show(
        errorNotificationTemplate({
          description: tIntegration("MustHaveOneMethod"),
          title: tIntegration("CannotUnlink"),
        }),
      );
      return;
    }

    openStandardConfirmModal({
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      confirmLabel: t("UnlinkAccountButton"),
      message: (
        <Text size="sm">
          <TypedTrans
            components={{ b: <b /> }}
            i18nKey="UnlinkAccountMessage"
            t={t}
            values={{ provider: provider === "github" ? "GitHub" : "LinkedIn" }}
          />
        </Text>
      ),
      onConfirm: () => confirmUnlinkProvider(provider),
      title: (
        <ModalTitle icon={<IconUnlink size={20} stroke={1.5} />} text={t("UnlinkAccountTitle")} />
      ),
    });
  };

  const confirmUnlinkProvider = async (provider: "github" | "linkedin") => {
    try {
      const providerName = provider === "linkedin" ? "linkedin_oidc" : provider;
      const targetIdentity = userIdentities.find((identity) => identity.provider === providerName);

      if (!targetIdentity) {
        throw new Error(`${provider} identity not found`);
      }

      const supabase = createBrowswerSupabaseClient();

      const { error } = await supabase.auth.unlinkIdentity(targetIdentity);

      if (error) {
        throw new Error(error.message);
      }

      setProviders((prev) => prev.filter((p) => p !== providerName));

      notifications.show(
        successNotificationTemplate({
          description: tIntegration("UnlinkSuccess", { provider }),
          title: t("UpdateSuccess"),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          description: getUserFacingError(error, tCommon),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    }
  };

  return (
    <Stack gap="md">
      <div>
        <Text fw={500} mb={4} size="sm">
          {title || t("ConnectedAccounts")}
        </Text>
        <Text c="dimmed" size="xs">
          {description || t("ConnectedAccountsDescription")}
        </Text>
      </div>
      <Group gap="md">
        {showOAuthProviders
          ? INTEGRATION_PROVIDERS.map(({ provider, providerKey, iconColor }) => {
              const icon = provider === "github" ? IconBrandGithub : IconBrandLinkedin;
              const isConnected = providers.includes(providerKey);
              const isDisabled = providers.length === 1 && isConnected;

              return (
                <IntegrationCard
                  connectedDescription={tIntegration("ClickToUnlink", {
                    provider:
                      provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn"),
                  })}
                  disabledDescription={tIntegration("LinkedButCannotUnlink")}
                  displayName={
                    provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn")
                  }
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
                      handleUnlinkClick(provider as "github" | "linkedin");
                    } else {
                      linkProvider(provider as "github" | "linkedin");
                    }
                  }}
                  provider={provider}
                  unconnectedDescription={tIntegration("ClickToLink", {
                    provider:
                      provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn"),
                  })}
                />
              );
            })
          : null}
        {showExtensionProvider ? (
          <IntegrationCard
            connectedDescription={
              extensionVersion
                ? tIntegration("ExtensionLinkedDescriptionWithVersion", {
                    version: extensionVersion,
                  })
                : tIntegration("ExtensionLinkedDescription")
            }
            displayName={tIntegration("BonderyChromeExtension")}
            icon={IconBrowser}
            iconColor="grape"
            isConnected={isExtensionInstalled}
            isDisabled={isExtensionInstalled}
            onClick={() => {
              if (isExtensionInstalled) {
                return;
              }

              openChromeExtensionModal();
            }}
            provider="bondery_chrome_extension"
            unconnectedDescription={tIntegration("ExtensionInstallDescription")}
          />
        ) : null}
        {showPWAProvider
          ? (() => {
              const isInstalled = isPWAInstalled || isInstalledFromBrowser;
              const isUnsupported = !canInstall && !isInstalled && !isChromiumDesktop;
              const isMenuInstall = !canInstall && !isInstalled && isChromiumDesktop;
              const isDisabled = isInstalled || isUnsupported || isMenuInstall;
              const disabledDescription = isUnsupported
                ? tIntegration("DesktopAppNotSupportedDescription")
                : isMenuInstall
                  ? tIntegration("DesktopAppMenuInstallDescription")
                  : undefined;

              return (
                <IntegrationCard
                  connectedDescription={tIntegration("DesktopAppInstalledDescription")}
                  disabledDescription={disabledDescription}
                  displayName={tIntegration("DesktopApp")}
                  icon={IconDeviceDesktop}
                  iconColor="grape"
                  isConnected={isInstalled}
                  isDisabled={isDisabled}
                  onClick={() => {
                    if (canInstall) {
                      void install();
                    }
                  }}
                  provider="pwa"
                  unconnectedDescription={tIntegration("DesktopAppInstallDescription")}
                />
              );
            })()
          : null}
      </Group>
    </Stack>
  );
}
