"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { notifications } from "@mantine/notifications";
import { useMemo, useState } from "react";
import {
  type LoginBusyAction,
  SocialLoginCard,
} from "@/app/(app)/login/components/SocialLoginCard";
import { createWebappAuthClient } from "@/lib/auth/client";
import { setLocalePreferencesCookie } from "@/lib/auth/detectLocale";
import { buildOAuthLoginMagicLinkUrls } from "@/lib/auth/magic-link-urls";
import { notifyPasskeyLoginError } from "@/lib/auth/notify-passkey-login-error";
import { useCommonTranslations, useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";

type OAuthLoginClientProps = {
  lastUsedLoginMethod: string | null;
  oauthProviders: OAuthProvidersBitmap | null;
};

/**
 * Authorization-server login gate — see page.tsx for why this is deliberately
 * independent of the webapp's own session. Always shows the sign-in buttons;
 * never redirects based on any pre-existing webapp state.
 */
export function OAuthLoginClient({ lastUsedLoginMethod, oauthProviders }: OAuthLoginClientProps) {
  const t = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const [busyAction, setBusyAction] = useState<LoginBusyAction>(null);
  const runtimeConfig = useWebappRuntimeConfig();
  const authClient = useMemo(() => createWebappAuthClient(runtimeConfig), [runtimeConfig]);
  const { webappUrl, websiteUrl } = runtimeConfig;
  const origin = typeof window === "undefined" ? webappUrl : window.location.origin;
  const search = typeof window === "undefined" ? "" : window.location.search;
  const magicLinkUrls = buildOAuthLoginMagicLinkUrls(origin, search);

  const handleOAuthLogin = async (provider: "github" | "linkedin") => {
    try {
      setBusyAction(provider);

      await setLocalePreferencesCookie();

      // No `redirect`/`oauth_query` param is built here: the current
      // page's query string already carries Better Auth's own signed
      // continuation (forwarded verbatim from /oauth/consent, or set
      // directly by the AS's /oauth2/authorize redirect). The
      // `oauthProviderClient()` plugin on this client automatically reads
      // `window.location.search` and attaches it as `oauth_query`, so once
      // sign-in completes, Better Auth resumes the original authorization
      // transaction instead of following `callbackURL` below — that URL is
      // only a fallback for the (invalid) case of landing here without one.
      const { error } = await authClient.signIn.social({
        callbackURL: `${webappUrl.replace(/\/$/, "")}${WEBAPP_ROUTES.HOME}`,
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
      await setLocalePreferencesCookie();

      const fallbackUrl = `${webappUrl.replace(/\/$/, "")}${WEBAPP_ROUTES.HOME}`;
      const { data, error } = await authClient.signIn.passkey();

      if (error) {
        notifyPasskeyLoginError(error, t);
        return;
      }

      const redirectUrl =
        data && typeof data === "object" && "url" in data && typeof data.url === "string"
          ? data.url
          : fallbackUrl;
      window.location.assign(redirectUrl);
    } catch (err) {
      notifyPasskeyLoginError(err, t);
    } finally {
      setBusyAction(null);
    }
  };

  const handleEmailSubmit = async (email: string): Promise<boolean> => {
    try {
      setBusyAction("email");
      await setLocalePreferencesCookie();

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

  return (
    <SocialLoginCard
      authClient={authClient}
      busyAction={busyAction}
      continueUrl={magicLinkUrls.callbackURL}
      lastUsedLoginMethod={lastUsedLoginMethod}
      oauthProviders={oauthProviders}
      onEmailSubmit={handleEmailSubmit}
      onPasskeyClick={() => void handlePasskeyLogin()}
      onProviderClick={handleOAuthLogin}
      surface="oauth"
      websiteUrl={websiteUrl}
    />
  );
}
