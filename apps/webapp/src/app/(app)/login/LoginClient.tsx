"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate } from "@bondery/mantine-next";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { notifications } from "@mantine/notifications";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { type LoginBusyAction, SocialLoginCard } from "@/components/auth/SocialLoginCard";
import { createWebappAuthClient } from "@/lib/auth/client";
import { setLocalePreferencesCookie } from "@/lib/auth/detectLocale";
import { buildLoginMagicLinkUrls } from "@/lib/auth/magic-link-urls";
import { notifyPasskeyLoginError } from "@/lib/auth/notify-passkey-login-error";
import { parseReturnIntent, RETURN_INTENT_PARAM } from "@/lib/auth/returnIntent";
import { useCommonTranslations, useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";

type LoginClientProps = {
  lastUsedLoginMethod: string | null;
  oauthProviders: OAuthProvidersBitmap | null;
};

export function LoginClient({ lastUsedLoginMethod, oauthProviders }: LoginClientProps) {
  const t = useLoginPageTranslations();
  const tCommon = useCommonTranslations();
  const [busyAction, setBusyAction] = useState<LoginBusyAction>(null);
  const runtimeConfig = useWebappRuntimeConfig();
  const authClient = useMemo(() => createWebappAuthClient(runtimeConfig), [runtimeConfig]);
  const searchParams = useSearchParams();
  const { websiteUrl } = runtimeConfig;

  const redirectParam = parseReturnIntent(searchParams);
  const origin = typeof window === "undefined" ? runtimeConfig.webappUrl : window.location.origin;
  const magicLinkUrls = buildLoginMagicLinkUrls(origin, redirectParam);
  const postLoginCallbackUrl = useMemo(() => {
    const startUrl = new URL("/auth/start", origin);
    if (redirectParam) {
      startUrl.searchParams.set(RETURN_INTENT_PARAM, redirectParam);
    }
    return startUrl.toString();
  }, [origin, redirectParam]);

  const handleOAuthLogin = async (provider: "github" | "linkedin") => {
    try {
      setBusyAction(provider);
      await setLocalePreferencesCookie();

      // Establish the API's native Better Auth session via social sign-in
      // first, then resume the webapp's OAuth-BFF exchange. Starting at
      // /auth/start without a native session stops on /oauth/login and forces
      // a second provider click. Authorization-server continuations belong on
      // `/oauth/login`, not this page.
      const { error } = await authClient.signIn.social({
        callbackURL: postLoginCallbackUrl,
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

      const { error } = await authClient.signIn.passkey();

      if (error) {
        notifyPasskeyLoginError(error, t);
        return;
      }

      window.location.assign(postLoginCallbackUrl);
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
      getPasskeyTestId="login-passkey"
      getProviderTestId={(providerKey) =>
        providerKey === "github" ? "login-github" : `login-${providerKey}`
      }
      lastUsedLoginMethod={lastUsedLoginMethod}
      oauthProviders={oauthProviders}
      onEmailSubmit={handleEmailSubmit}
      onPasskeyClick={() => void handlePasskeyLogin()}
      onProviderClick={handleOAuthLogin}
      surface="webapp"
      websiteUrl={websiteUrl}
    />
  );
}
