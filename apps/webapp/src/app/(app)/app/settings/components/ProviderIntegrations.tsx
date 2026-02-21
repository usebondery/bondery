"use client";

import { Group, Stack, Text } from "@mantine/core";
import { IconUnlink } from "@tabler/icons-react";
import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { BonderyIcon } from "@bondery/branding/react";
import { CHROME_EXTENSION_URL } from "@bondery/helpers";
import { INTEGRATION_PROVIDERS } from "@/lib/config";
import { detectBonderyChromeExtension } from "@/lib/extension/detectBonderyChromeExtension";
import { IntegrationCard } from "./IntegrationCard";
import { modals } from "@mantine/modals";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface UserIdentity {
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
}

interface ProviderIntegrationsProps {
  providers: string[];
  userIdentities: UserIdentity[];
}

export function ProviderIntegrations({
  providers: initialProviders,
  userIdentities,
}: ProviderIntegrationsProps) {
  const [providers, setProviders] = useState<string[]>(initialProviders);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  const t = useTranslations("SettingsPage.Profile");
  const tIntegration = useTranslations("SettingsPage.Integration");

  useEffect(() => {
    let isMounted = true;

    void detectBonderyChromeExtension().then((state) => {
      if (!isMounted) {
        return;
      }

      setIsExtensionInstalled(state === "installed");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const linkProvider = async (provider: "github" | "linkedin") => {
    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: tIntegration("LinkingAccount"),
        description: tIntegration("Connecting", {
          provider: provider === "github" ? "GitHub" : "LinkedIn",
        }),
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
          title: "Error",
          description:
            error instanceof Error ? error.message : tIntegration("LinkError", { provider }),
        }),
      );
    }
  };

  const handleUnlinkClick = (provider: "github" | "linkedin") => {
    if (providers.length <= 1) {
      notifications.show(
        errorNotificationTemplate({
          title: tIntegration("CannotUnlink"),
          description: tIntegration("MustHaveOneMethod"),
        }),
      );
      return;
    }

    modals.openConfirmModal({
      title: (
        <ModalTitle text={t("UnlinkAccountTitle")} icon={<IconUnlink size={20} stroke={1.5} />} />
      ),
      children: (
        <Text size="sm">
          {t.rich("UnlinkAccountMessage", {
            provider: provider === "github" ? "GitHub" : "LinkedIn",
            b: (chunks) => <b>{chunks}</b>,
          })}
        </Text>
      ),
      centered: true,
      labels: {
        confirm: t("UnlinkAccountButton"),
        cancel: t("Cancel"),
      },
      confirmProps: { color: "red" },
      onConfirm: () => confirmUnlinkProvider(provider),
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
          title: t("UpdateSuccess"),
          description: tIntegration("UnlinkSuccess", { provider }),
        }),
      );
    } catch (error) {
      notifications.show(
        errorNotificationTemplate({
          title: "Error",
          description:
            error instanceof Error ? error.message : tIntegration("UnlinkError", { provider }),
        }),
      );
    }
  };

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={4}>
          {t("ConnectedAccounts")}
        </Text>
        <Text size="xs" c="dimmed">
          {t("ConnectedAccountsDescription")}
        </Text>
      </div>
      <Group gap="md">
        {INTEGRATION_PROVIDERS.map(({ provider, providerKey, iconColor }) => {
          const icon = provider === "github" ? IconBrandGithub : IconBrandLinkedin;
          const isConnected = providers.includes(providerKey);
          const isDisabled = providers.length === 1 && isConnected;

          return (
            <IntegrationCard
              key={provider}
              provider={provider}
              displayName={
                provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn")
              }
              icon={icon}
              iconColor={iconColor}
              isConnected={isConnected}
              isDisabled={isDisabled}
              connectedDescription={tIntegration("ClickToUnlink", {
                provider: provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn"),
              })}
              unconnectedDescription={tIntegration("ClickToLink", {
                provider: provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn"),
              })}
              disabledDescription={tIntegration("LinkedButCannotUnlink")}
              onClick={() => {
                if (isDisabled) return;
                if (isConnected) {
                  handleUnlinkClick(provider as "github" | "linkedin");
                } else {
                  linkProvider(provider as "github" | "linkedin");
                }
              }}
            />
          );
        })}
        <IntegrationCard
          provider="bondery_chrome_extension"
          displayName={tIntegration("BonderyChromeExtension")}
          iconNode={<BonderyIcon width={28} height={28} />}
          iconColor="grape"
          isConnected={isExtensionInstalled}
          isDisabled={isExtensionInstalled}
          connectedDescription={tIntegration("ExtensionLinkedDescription")}
          unconnectedDescription={tIntegration("ExtensionInstallDescription")}
          onClick={() => {
            if (isExtensionInstalled) {
              return;
            }

            window.open(CHROME_EXTENSION_URL, "_blank", "noopener,noreferrer");
          }}
        />
      </Group>
    </Stack>
  );
}
