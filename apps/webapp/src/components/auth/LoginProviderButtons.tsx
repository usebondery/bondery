"use client";

import {
  areAllOAuthProvidersDisabled,
  isOAuthProviderEnabled,
} from "@bondery/helpers/auth/oauth-providers";
import { CornerLabeledButton } from "@bondery/mantine-next";
import type { OAuthProviderId, OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { Stack, Text, Tooltip } from "@mantine/core";
import { IconBrandGithubFilled, IconBrandLinkedin, IconFingerprint } from "@tabler/icons-react";
import type { ComponentType, CSSProperties } from "react";
import {
  isLastUsedMagicLink,
  isLastUsedOAuthProvider,
  isLastUsedPasskey,
} from "@/lib/auth/last-login-method";
import { useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { INTEGRATION_PROVIDERS } from "@/lib/platform/config";
import classes from "./LoginProviderButtons.module.css";

const PROVIDER_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  github: IconBrandGithubFilled,
  linkedin: IconBrandLinkedin,
};

export type LoginBusyAction = OAuthProviderId | "email" | "passkey" | null;

type LoginProviderButtonsProps = {
  allowedOAuthProviders?: OAuthProviderId[];
  busyAction: LoginBusyAction;
  getPasskeyTestId?: string;
  getProviderTestId?: (providerKey: string) => string | undefined;
  lastUsedLoginMethod: string | null;
  oauthProviders: OAuthProvidersBitmap | null;
  onPasskeyClick: () => void;
  onProviderClick: (provider: OAuthProviderId) => void;
  showOAuth: boolean;
  showPasskey: boolean;
};

export function LoginProviderButtons({
  allowedOAuthProviders,
  busyAction,
  getPasskeyTestId,
  getProviderTestId,
  lastUsedLoginMethod,
  oauthProviders,
  onPasskeyClick,
  onProviderClick,
  showOAuth,
  showPasskey,
}: LoginProviderButtonsProps) {
  const t = useLoginPageTranslations();
  const magicLinkIsLastUsed = isLastUsedMagicLink(lastUsedLoginMethod);
  const passkeyIsLastUsed =
    showPasskey && isLastUsedPasskey(lastUsedLoginMethod) && !magicLinkIsLastUsed;
  const visibleProviders =
    allowedOAuthProviders === undefined
      ? INTEGRATION_PROVIDERS
      : INTEGRATION_PROVIDERS.filter((provider) =>
          allowedOAuthProviders.includes(provider.provider),
        );
  const allOAuthDisabled =
    allowedOAuthProviders === undefined &&
    showOAuth &&
    areAllOAuthProvidersDisabled(oauthProviders);

  return (
    <Stack gap="xs" w="100%">
      {allOAuthDisabled ? (
        <Text c="dimmed" size="sm" ta="center">
          {t("ProvidersUnavailable")}
        </Text>
      ) : null}

      {showOAuth
        ? visibleProviders.map((provider) => {
            const IconComponent = PROVIDER_ICONS[provider.icon] ?? IconBrandGithubFilled;
            const providerId = provider.provider;
            const enabled = isOAuthProviderEnabled(oauthProviders, providerId);
            const isLastUsed =
              enabled &&
              !passkeyIsLastUsed &&
              !magicLinkIsLastUsed &&
              isLastUsedOAuthProvider(lastUsedLoginMethod, providerId);
            const unavailableLabel = t("ProviderUnavailable", {
              provider: provider.displayName,
            });

            const isThisLoading = enabled && busyAction === providerId;
            const button = (
              <CornerLabeledButton
                autoContrast
                className={classes.brandButton}
                color={provider.backgroundColor}
                cornerLabel={isLastUsed ? t("LastUsed") : undefined}
                cornerLabelTestId="login-last-used-badge"
                data-testid={getProviderTestId?.(provider.providerKey)}
                disabled={!enabled || (busyAction !== null && !isThisLoading)}
                fullWidth
                leftSection={<IconComponent size={20} />}
                loading={isThisLoading}
                onClick={() => {
                  if (!enabled) {
                    return;
                  }
                  onProviderClick(providerId);
                }}
                size="lg"
                style={
                  {
                    "--login-brand-button-bg": provider.backgroundColor,
                  } as CSSProperties
                }
                variant="filled"
              >
                {t("ContinueWith", { provider: provider.displayName })}
              </CornerLabeledButton>
            );

            if (enabled) {
              return <div key={providerId}>{button}</div>;
            }

            return (
              <Tooltip key={providerId} label={unavailableLabel}>
                <span style={{ display: "block", width: "100%" }}>{button}</span>
              </Tooltip>
            );
          })
        : null}

      {showPasskey ? (
        <CornerLabeledButton
          autoContrast
          className={classes.brandButton}
          color="gray"
          cornerLabel={passkeyIsLastUsed ? t("LastUsed") : undefined}
          cornerLabelTestId="login-last-used-badge"
          data-testid={getPasskeyTestId}
          disabled={busyAction !== null && busyAction !== "passkey"}
          fullWidth
          leftSection={<IconFingerprint size={20} />}
          loading={busyAction === "passkey"}
          onClick={onPasskeyClick}
          size="lg"
          style={
            {
              "--login-brand-button-bg": "var(--mantine-color-gray-filled)",
            } as CSSProperties
          }
          variant="filled"
        >
          {t("ContinueWithPasskey")}
        </CornerLabeledButton>
      ) : null}
    </Stack>
  );
}
