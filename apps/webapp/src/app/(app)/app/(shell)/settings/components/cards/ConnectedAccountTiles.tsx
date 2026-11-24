"use client";

import { BrandIcon, type BrandIconName } from "@bondery/branding";
import { isOAuthProviderEnabled } from "@bondery/helpers/auth/oauth-providers";
import { SUCCESS_TONE_STYLE, TileCard, TileCardGrid } from "@bondery/mantine-next";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { Badge } from "@mantine/core";
import { IconCircleCheck, IconCircleDashed } from "@tabler/icons-react";
import type { ReactElement } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { INTEGRATION_PROVIDERS } from "@/lib/platform/config";
import type { UserIdentity } from "./socialSignInActions";
import { useSocialSignInActions } from "./useSocialSignInActions";

const PROVIDER_LOGOS: Record<string, BrandIconName> = {
  github: "github",
  linkedin: "linkedin",
};

interface ConnectedAccountTileProps {
  /** True when this is the only linked method, so unlinking would lock the account out. */
  cannotUnlink: boolean;
  isLinkEnabled: boolean;
  isLinked: boolean;
  onLink: () => void;
  onUnlink: () => void;
  provider: (typeof INTEGRATION_PROVIDERS)[number];
}

/**
 * One sign-in provider, as a `TileCard` whose whole surface is the hit target.
 *
 * A linked provider fills with the success green, so the state reads at a glance before the pill
 * does. The pill rides the card's right section, which keeps it centered against the title on a
 * short card and a tall one alike.
 */
function ConnectedAccountTile({
  cannotUnlink,
  isLinked,
  isLinkEnabled,
  onLink,
  onUnlink,
  provider,
}: ConnectedAccountTileProps): ReactElement {
  const t = useSettingsPageTranslations("Integration");
  const displayName = provider.provider === "github" ? t("GitHub") : t("LinkedIn");

  const isUnavailable = !isLinked && !isLinkEnabled;
  const isDisabled = isUnavailable || cannotUnlink;

  let disabledReason: string | undefined;
  if (isUnavailable) {
    disabledReason = t("ProviderUnavailable", { provider: displayName });
  } else if (cannotUnlink) {
    disabledReason = t("LinkedButCannotUnlink");
  }

  return (
    <TileCard
      icon={<BrandIcon name={PROVIDER_LOGOS[provider.provider] ?? "github"} size={32} />}
      isDisabled={isDisabled}
      onClick={() => {
        if (isLinked) {
          onUnlink();
        } else {
          onLink();
        }
      }}
      rightSection={
        <Badge
          color={isLinked ? "green" : "gray"}
          leftSection={isLinked ? <IconCircleCheck size={12} /> : <IconCircleDashed size={12} />}
          radius="xl"
          size="xs"
          tt="none"
          variant="light"
        >
          {isLinked ? t("Connected") : t("NotConnected")}
        </Badge>
      }
      style={isLinked ? SUCCESS_TONE_STYLE : undefined}
      title={displayName}
      tooltip={disabledReason}
    />
  );
}

interface ConnectedAccountTilesProps {
  oauthProviders: OAuthProvidersBitmap | null;
  providers: string[];
  userIdentities: UserIdentity[];
}

/** GitHub and LinkedIn, one tappable tile each. */
export function ConnectedAccountTiles({
  oauthProviders,
  providers,
  userIdentities,
}: ConnectedAccountTilesProps): ReactElement {
  const { isLastLinkedMethod, isLinked, link, unlink } = useSocialSignInActions({
    initialProviders: providers,
    userIdentities,
  });

  return (
    <TileCardGrid minCardWidth="16rem">
      {INTEGRATION_PROVIDERS.map((provider) => {
        const linked = isLinked(provider.provider, provider.providerKey);

        return (
          <ConnectedAccountTile
            cannotUnlink={linked && isLastLinkedMethod}
            isLinkEnabled={isOAuthProviderEnabled(oauthProviders, provider.provider)}
            isLinked={linked}
            key={provider.provider}
            onLink={() => link(provider.provider)}
            onUnlink={() => unlink(provider.provider)}
            provider={provider}
          />
        );
      })}
    </TileCardGrid>
  );
}
