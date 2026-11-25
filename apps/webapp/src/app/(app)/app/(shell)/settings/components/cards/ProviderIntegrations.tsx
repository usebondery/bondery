"use client";

import { TileCardGrid } from "@bondery/mantine-next";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { Stack, Text } from "@mantine/core";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { nonEmpty } from "@/lib/shared/nonEmpty";
import { BrowserExtensionTile, DesktopAppTile, McpTile } from "./appTiles";
import { ConnectedAccountTiles } from "./ConnectedAccountTiles";
import type { UserIdentity } from "./socialSignInActions";

interface ProviderIntegrationsProps {
  apiBaseUrl?: string;
  description?: string;
  hideTitle?: boolean;
  oauthProviders?: OAuthProvidersBitmap | null;
  providers: string[];
  showExtensionProvider?: boolean;
  showMcpProvider?: boolean;
  showOAuthProviders?: boolean;
  showPWAProvider?: boolean;
  title?: string;
  userIdentities: UserIdentity[];
}

/**
 * Every way to connect an account or an app.
 *
 * Both groups are tiles, so the whole surface of each is the hit target. The sign-in providers
 * turn success green once linked, and the installable apps carry their own install state.
 */
export function ProviderIntegrations({
  providers,
  userIdentities,
  oauthProviders = null,
  showOAuthProviders = true,
  showExtensionProvider = true,
  showMcpProvider = false,
  showPWAProvider = true,
  hideTitle = false,
  title,
  description,
  apiBaseUrl,
}: ProviderIntegrationsProps) {
  const t = useSettingsPageTranslations("Profile");

  return (
    <Stack gap="md">
      {hideTitle ? null : (
        <div>
          <Text fw={500} mb={4} size="sm">
            {nonEmpty(title) ?? t("ConnectedAccounts")}
          </Text>
          <Text c="dimmed" size="xs">
            {nonEmpty(description) ?? t("ConnectedAccountsDescription")}
          </Text>
        </div>
      )}
      {showOAuthProviders ? (
        <ConnectedAccountTiles
          oauthProviders={oauthProviders}
          providers={providers}
          userIdentities={userIdentities}
        />
      ) : null}
      {showExtensionProvider || showPWAProvider || showMcpProvider ? (
        <TileCardGrid minCardWidth="17rem">
          {showExtensionProvider ? <BrowserExtensionTile /> : null}
          {showPWAProvider ? <DesktopAppTile /> : null}
          {showMcpProvider ? <McpTile apiBaseUrl={apiBaseUrl} /> : null}
        </TileCardGrid>
      ) : null}
    </Stack>
  );
}
