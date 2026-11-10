// biome-ignore-all lint/nursery/useReactCompiler: intentional ref sync and controlled local state for React Compiler
"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { OAuthProviderId, OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { notifications } from "@mantine/notifications";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { type LoginBusyAction, SocialLoginCard } from "@/components/auth/SocialLoginCard";
import { createWebappAuthClient } from "@/lib/auth/client";
import { notifyPasskeyLoginError } from "@/lib/auth/notify-passkey-login-error";
import {
  baIdentityMatchesBff,
  buildReconfirmMagicLinkUrls,
  buildReconfirmSettingsUrl,
  getBetterAuthSessionIdentity,
  isBetterAuthSessionFresh,
  type ReconfirmPurpose,
} from "@/lib/auth/reconfirm";
import { useCommonTranslations, useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { usePasskeysQuery } from "@/lib/query/hooks/usePasskeys";
import { useSettingsQuery } from "@/lib/query/hooks/useSettings";

type ConfirmClientProps = {
  accountEmail: string;
  hasReturned: boolean;
  lastUsedLoginMethod: string | null;
  oauthProviders: OAuthProvidersBitmap | null;
  purpose: ReconfirmPurpose;
  targetId: string | null;
};

type ConfirmIdentityStatus = "ok" | "mismatch" | "stale";

type BffIdentity = {
  email: string;
  userId: string | null;
};

function linkedProviderIds(providers: string[]): Set<"github" | "linkedin"> {
  const linked = new Set<"github" | "linkedin">();
  if (providers.includes("github")) {
    linked.add("github");
  }
  if (providers.includes("linkedin") || providers.includes("linkedin_oidc")) {
    linked.add("linkedin");
  }
  return linked;
}

function shouldOfferSocial(
  purpose: ReconfirmPurpose,
  linked: Set<"github" | "linkedin">,
  provider: "github" | "linkedin",
): boolean {
  if (!linked.has(provider)) {
    return false;
  }
  if (purpose === "link_github" && provider === "github") {
    return false;
  }
  if (purpose === "link_linkedin" && provider === "linkedin") {
    return false;
  }
  return true;
}

function readBffIdentity(
  settings: Record<string, unknown> | undefined,
  fallbackEmail: string,
): BffIdentity {
  const settingsEmail = typeof settings?.email === "string" ? settings.email : "";
  const identities = Array.isArray(settings?.identities)
    ? (settings.identities as Array<{ user_id?: string }>)
    : [];
  return {
    // The server-side session always carries the account email. Fall back to it
    // so a failed settings read cannot leave the picker with no email method.
    email: settingsEmail || fallbackEmail,
    userId: identities[0]?.user_id ?? null,
  };
}

async function checkConfirmIdentity(bff: BffIdentity): Promise<ConfirmIdentityStatus> {
  const ba = await getBetterAuthSessionIdentity();
  if (!ba) {
    // No Better Auth session at all — the user must sign in again. This is not
    // a different account, so do not claim an identity mismatch.
    return "stale";
  }
  const match = baIdentityMatchesBff({
    baEmail: ba.email,
    baUserId: ba.id,
    bffEmail: bff.email,
    bffUserId: bff.userId,
  });
  if (!match) {
    return "mismatch";
  }
  if (!(await isBetterAuthSessionFresh())) {
    return "stale";
  }
  return "ok";
}

export function ConfirmClient({
  accountEmail,
  hasReturned,
  lastUsedLoginMethod,
  oauthProviders,
  purpose,
  targetId,
}: ConfirmClientProps) {
  const t = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const [busyAction, setBusyAction] = useState<LoginBusyAction>(null);
  const [methodPickerOpen, setMethodPickerOpen] = useState(!hasReturned);
  const returnHandledRef = useRef(false);
  const runtimeConfig = useWebappRuntimeConfig();
  const authClient = createWebappAuthClient(runtimeConfig);
  const searchParams = useSearchParams();
  const { websiteUrl } = runtimeConfig;
  const { data: settingsResult, isPending: settingsPending } = useSettingsQuery();
  const { data: passkeys = [], isPending: passkeysPending } = usePasskeysQuery();

  const origin = typeof window === "undefined" ? runtimeConfig.webappUrl : window.location.origin;
  const magicLinkUrls = buildReconfirmMagicLinkUrls(origin, purpose, targetId);
  const settingsUrl = buildReconfirmSettingsUrl(origin, purpose, targetId);
  const bff = readBffIdentity(settingsResult?.data, accountEmail);
  const providers = Array.isArray(settingsResult?.data?.providers)
    ? (settingsResult.data.providers as string[])
    : [];
  const linked = linkedProviderIds(providers);
  const allowedOAuthProviders: OAuthProviderId[] = [];
  if (shouldOfferSocial(purpose, linked, "github")) {
    allowedOAuthProviders.push("github");
  }
  if (shouldOfferSocial(purpose, linked, "linkedin")) {
    allowedOAuthProviders.push("linkedin");
  }

  const showIdentityError = useCallback(
    (status: ConfirmIdentityStatus) => {
      notifications.show({
        id: `confirm-identity-${status}`,
        ...errorNotificationTemplate({
          description: status === "mismatch" ? t("ConfirmMismatch") : t("ConfirmStillStale"),
          title: t("ConfirmTitle"),
        }),
      });
    },
    [t],
  );

  useEffect(() => {
    if (!hasReturned || returnHandledRef.current || settingsPending) {
      return;
    }
    const queryError = searchParams.get("error");
    if (queryError) {
      returnHandledRef.current = true;
      // A failed return used to fall through to the picker with no message, so a
      // rejected link looked like a dead button. Say what happened.
      notifications.show({
        id: `confirm-return-error-${queryError}`,
        ...errorNotificationTemplate({
          description: getAuthUserFacingError({ code: queryError }, tCommon),
          title: t("AuthenticationError"),
        }),
      });
      setMethodPickerOpen(true);
      return;
    }
    if (!settingsResult?.data) {
      returnHandledRef.current = true;
      showIdentityError("stale");
      setMethodPickerOpen(true);
      return;
    }

    returnHandledRef.current = true;
    void (async () => {
      const status = await checkConfirmIdentity(readBffIdentity(settingsResult.data, accountEmail));
      if (status === "ok") {
        window.location.assign(settingsUrl);
        return;
      }
      showIdentityError(status);
      setMethodPickerOpen(true);
    })();
  }, [
    hasReturned,
    searchParams,
    settingsPending,
    settingsResult,
    settingsUrl,
    showIdentityError,
    accountEmail,
    tCommon,
    t,
  ]);

  const goToSettingsIfFresh = async (): Promise<boolean> => {
    const status = await checkConfirmIdentity(bff);
    if (status === "ok") {
      window.location.assign(settingsUrl);
      return true;
    }
    showIdentityError(status);
    return false;
  };

  const handleOAuthLogin = async (provider: "github" | "linkedin") => {
    try {
      setBusyAction(provider);
      const { error } = await authClient.signIn.social({
        callbackURL: magicLinkUrls.callbackURL,
        errorCallbackURL: magicLinkUrls.errorCallbackURL,
        provider,
      });

      if (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getAuthUserFacingError(error, tCommon),
            title: t("AuthenticationError"),
          }),
        );
      }
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          description: getAuthUserFacingError(err, tCommon),
          title: t("UnexpectedError"),
        }),
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      setBusyAction("passkey");
      const { error } = await authClient.signIn.passkey();
      if (error) {
        notifyPasskeyLoginError(error, t);
        return;
      }
      await goToSettingsIfFresh();
    } catch (err) {
      notifyPasskeyLoginError(err, t);
    } finally {
      setBusyAction(null);
    }
  };

  const handleEmailSubmit = async (email: string): Promise<boolean> => {
    try {
      setBusyAction("email");
      const { error } = await authClient.signIn.magicLink({
        callbackURL: magicLinkUrls.callbackURL,
        email,
        errorCallbackURL: magicLinkUrls.errorCallbackURL,
      });

      if (error) {
        notifications.show(
          errorNotificationTemplate({
            description: getAuthUserFacingError(error, tCommon),
            title: t("AuthenticationError"),
          }),
        );
        return false;
      }

      return true;
    } catch (err) {
      notifications.show(
        errorNotificationTemplate({
          description: getAuthUserFacingError(err, tCommon),
          title: t("UnexpectedError"),
        }),
      );
      return false;
    } finally {
      setBusyAction(null);
    }
  };

  const showMethods = methodPickerOpen && !settingsPending && !passkeysPending;

  return (
    <SocialLoginCard
      allowedOAuthProviders={showMethods ? allowedOAuthProviders : []}
      authClient={authClient}
      busyAction={busyAction}
      cancelHref={WEBAPP_ROUTES.SETTINGS}
      continueUrl={magicLinkUrls.callbackURL}
      description={t("ConfirmDescription")}
      getPasskeyTestId="confirm-passkey"
      getProviderTestId={(providerKey) =>
        providerKey === "github" ? "confirm-github" : `confirm-${providerKey}`
      }
      lastUsedLoginMethod={lastUsedLoginMethod}
      leftContent="shield"
      loading={!showMethods}
      lockedEmail={showMethods ? bff.email : ""}
      oauthProviders={oauthProviders}
      onEmailSubmit={handleEmailSubmit}
      onPasskeyClick={() => void handlePasskeyLogin()}
      onProviderClick={handleOAuthLogin}
      pollForSession={false}
      showPasskey={showMethods && passkeys.length > 0}
      showTerms={false}
      surface="webapp"
      title={t("ConfirmTitle")}
      websiteUrl={websiteUrl}
    />
  );
}
