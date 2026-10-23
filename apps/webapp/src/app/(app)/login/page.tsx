import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { Suspense } from "react";
import { getOAuthProvidersServer } from "@/lib/api/domains/server/oauth-providers";
import { resolveAuthorizationServerErrorHref } from "@/lib/auth/authorization-server-error";
import { getLastUsedLoginMethodCookie } from "@/lib/auth/getLastUsedLoginMethodCookie";
import { resolveServerSession, signOutStaleServerSession } from "@/lib/auth/resolveServerSession";
import { parseReturnIntent, RETURN_INTENT_PARAM, routeFromReturn } from "@/lib/auth/returnIntent";
import { redirectRoute } from "@/lib/navigation/redirect/route";
import { routeAssert } from "@/lib/navigation/route/assert";
import { LoginClient } from "./LoginClient";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Login route gate: validated sessions redirect to the app before the login UI
 * renders. Stale or missing sessions clear auth cookies and show the login form.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authorizationServerErrorHref = resolveAuthorizationServerErrorHref(params);
  if (authorizationServerErrorHref) {
    // BFF session must not swallow /oauth2/authorize failures (invalid_redirect).
    redirectRoute(routeAssert(authorizationServerErrorHref));
  }

  const oauthProvidersPromise = getOAuthProvidersServer();
  const [session, lastUsedLoginMethod] = await Promise.all([
    resolveServerSession(),
    getLastUsedLoginMethodCookie(),
  ]);

  const redirectParam = params[RETURN_INTENT_PARAM];
  const redirectValue = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;
  const returnPath = redirectValue
    ? parseReturnIntent(new URLSearchParams({ [RETURN_INTENT_PARAM]: redirectValue }))
    : null;

  if (session.status === "ok") {
    redirectRoute(returnPath ? routeFromReturn(returnPath) : routeAssert(WEBAPP_ROUTES.HOME));
  }

  // Drop stale BFF session cookies so they are not retried forever.
  await signOutStaleServerSession();

  const oauthProviders = await oauthProvidersPromise;

  return (
    <Suspense fallback={null}>
      <LoginClient lastUsedLoginMethod={lastUsedLoginMethod} oauthProviders={oauthProviders} />
    </Suspense>
  );
}
