"use client";

import { detachPromise } from "@bondery/helpers/async";
import { useState } from "react";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import {
  linkSocialProvider,
  type SocialProvider,
  type UserIdentity,
  unlinkSocialProvider,
  withoutProvider,
} from "./socialSignInActions";

interface UseSocialSignInActionsOptions {
  initialProviders: string[];
  userIdentities: UserIdentity[];
}

/**
 * Links and unlinks the GitHub and LinkedIn sign-in accounts and keeps the linked list in sync.
 * Every click first confirms the user's identity, so the action can return early.
 */
export function useSocialSignInActions({
  initialProviders,
  userIdentities,
}: UseSocialSignInActionsOptions) {
  const [providers, setProviders] = useState<string[]>(initialProviders);
  const t = useSettingsPageTranslations("Profile");
  const tIntegration = useSettingsPageTranslations("Integration");
  const tCommon = useCommonTranslations();
  const context = { t, tCommon, tIntegration, userIdentities };

  return {
    /** True when only one method remains, so unlinking it would lock the account out. */
    isLastLinkedMethod: providers.length === 1,
    isLinked: (provider: string, providerKey: string) =>
      providers.includes(provider) ||
      providers.includes(providerKey) ||
      (provider === "linkedin" && providers.includes("linkedin_oidc")),
    link: (provider: SocialProvider) => {
      detachPromise(linkSocialProvider(provider, context));
    },
    unlink: (provider: SocialProvider) => {
      detachPromise(
        unlinkSocialProvider(provider, context, {
          canUnlink: providers.length > 1,
          onUnlinked: (unlinked) => {
            setProviders((current) => withoutProvider(current, unlinked));
          },
        }),
      );
    },
  };
}
