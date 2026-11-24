"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { TranslateFn } from "@bondery/translations";
import { notifications } from "@mantine/notifications";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import {
  openUnlinkProviderConfirm,
  providerKeyFor,
  runLinkSocialProvider,
} from "../../settingsAuthActions";

type SocialProvider = "github" | "linkedin";

interface UserIdentity {
  id: string;
  identity_id: string;
  provider: string;
  user_id: string;
}

interface SignInActionContext {
  t: TranslateFn<"SettingsPage", "Profile">;
  tCommon: TranslateFn<"common">;
  tIntegration: TranslateFn<"SettingsPage", "Integration">;
  userIdentities: UserIdentity[];
}

/** Providers that mean "linkedin" for a linked account. */
const LINKEDIN_PROVIDER_KEYS = new Set(["linkedin", "linkedin_oidc"]);

function providerDisplayName(
  tIntegration: SignInActionContext["tIntegration"],
  provider: SocialProvider,
) {
  return provider === "github" ? tIntegration("GitHub") : tIntegration("LinkedIn");
}

/** Links a GitHub or LinkedIn account, then leaves the settings query to pick the change up. */
export async function linkSocialProvider(
  provider: SocialProvider,
  { tCommon, tIntegration }: SignInActionContext,
): Promise<void> {
  const stepped = await ensureFreshIdentity({
    purpose: provider === "github" ? "link_github" : "link_linkedin",
  });
  if (stepped !== "fresh") {
    return;
  }

  const displayName = providerDisplayName(tIntegration, provider);
  const loadingNotification = notifications.show({
    ...loadingNotificationTemplate({
      description: tIntegration("Connecting", { provider: displayName }),
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
}

/**
 * Asks for confirmation, then unlinks a GitHub or LinkedIn account.
 * Refuses when it is the last linked method: the account would have no way back in.
 */
export async function unlinkSocialProvider(
  provider: SocialProvider,
  context: SignInActionContext,
  options: { canUnlink: boolean; onUnlinked: (provider: SocialProvider) => void },
): Promise<void> {
  const { t, tCommon, tIntegration, userIdentities } = context;

  if (!options.canUnlink) {
    notifications.show(
      errorNotificationTemplate({
        description: tIntegration("MustHaveOneMethod"),
        title: tIntegration("CannotUnlink"),
      }),
    );
    return;
  }

  const stepped = await ensureFreshIdentity({
    purpose: provider === "github" ? "unlink_github" : "unlink_linkedin",
  });
  if (stepped !== "fresh") {
    return;
  }

  openUnlinkProviderConfirm({
    displayName: providerDisplayName(tIntegration, provider),
    identities: userIdentities,
    onUnlinked: (unlinked) => {
      options.onUnlinked(unlinked);
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
}

/** Drops a provider and its aliases (such as `linkedin_oidc`) from the linked list. */
export function withoutProvider(linked: string[], unlinked: SocialProvider): string[] {
  return linked.filter((current) =>
    unlinked === "linkedin"
      ? !LINKEDIN_PROVIDER_KEYS.has(current)
      : current !== unlinked && current !== providerKeyFor(unlinked),
  );
}

export type { SocialProvider, UserIdentity };
