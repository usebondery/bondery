"use client";

import { Group, Stack, Text } from "@mantine/core";
import { IconUnlink } from "@tabler/icons-react";
import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import { INTEGRATION_PROVIDERS } from "@/lib/config";
import { IntegrationCard } from "./IntegrationCard";
import { modals } from "@mantine/modals";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";

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

  const t = useTranslations("SettingsPage.Profile");
  const tIntegration = useTranslations("SettingsPage.Integration");

  const linkProvider = async (provider: "github" | "linkedin") => {
    const loadingNotification = notifications.show({
      title: tIntegration("LinkingAccount"),
      message: tIntegration("Connecting", {
        provider: provider === "github" ? "GitHub" : "LinkedIn",
      }),
      loading: true,
      autoClose: false,
      withCloseButton: false,
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
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : tIntegration("LinkError", { provider }),
        color: "red",
      });
    }
  };

  const handleUnlinkClick = (provider: "github" | "linkedin") => {
    if (providers.length <= 1) {
      notifications.show({
        title: tIntegration("CannotUnlink"),
        message: tIntegration("MustHaveOneMethod"),
        color: "red",
      });
      return;
    }

    modals.openConfirmModal({
      title: (
        <Group gap="xs">
          <IconUnlink size={20} stroke={1.5} />
          <Text>{t("UnlinkAccountTitle")}</Text>
        </Group>
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

      notifications.show({
        title: t("UpdateSuccess"),
        message: tIntegration("UnlinkSuccess", { provider }),
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : tIntegration("UnlinkError", { provider }),
        color: "red",
      });
    }
  };

  return (
    <Stack gap="sm">
      <Text size="sm" fw={500}>
        {t("ConnectedAccounts")}
      </Text>
      <Group gap="md">
        {INTEGRATION_PROVIDERS.map(({ provider, providerKey, displayName, iconColor }) => {
          const icon = provider === "github" ? IconBrandGithub : IconBrandLinkedin;
          const isConnected = providers.includes(providerKey);
          const isDisabled = providers.length === 1 && isConnected;

          return (
            <IntegrationCard
              key={provider}
              provider={provider}
              displayName={displayName}
              icon={icon}
              iconColor={iconColor}
              isConnected={isConnected}
              isDisabled={isDisabled}
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
      </Group>
    </Stack>
  );
}
