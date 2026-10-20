import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { NextResponse } from "next/server";
import { joinApiUrl, resolveServerApiBaseUrl } from "@/lib/api/resolveServerApiUrl";
import {
  BYPASS_ONBOARDING_ONCE_COOKIE,
  OAUTH_FLOW_COOKIE,
  WEBAPP_SESSION_COOKIE,
} from "@/lib/auth/constants";
import { LOCALE_PREFS_COOKIE } from "@/lib/auth/detectLocale";
import {
  completeOAuthCodeExchange,
  decryptOAuthFlow,
  encryptWebappSession,
  webappSessionCookieOptions,
} from "@/lib/auth/oauthClient.server";
import { isSafeReturnPath, shouldBypassOnboardingForReturnPath } from "@/lib/auth/returnIntent";
import {
  buildWebappRuntimeConfigFromEnv,
  getWebappPublicOrigin,
} from "@/lib/platform/runtimeConfig.server";

function parseLocalePrefs(
  raw: string | undefined,
): { timezone: string; timeFormat: "12h" | "24h" } | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const timezone = typeof parsed.timezone === "string" ? parsed.timezone.trim() : null;
    const timeFormat =
      parsed.timeFormat === "12h" || parsed.timeFormat === "24h" ? parsed.timeFormat : null;
    if (!timezone || !timeFormat) {
      return null;
    }
    return { timeFormat, timezone };
  } catch {
    return null;
  }
}

async function postAuthApiRequest(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<void> {
  const url = joinApiUrl(resolveServerApiBaseUrl(), path);

  await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

async function initializeUserViaApi(accessToken: string): Promise<void> {
  try {
    await postAuthApiRequest(API_ROUTES.ME_INITIALIZE, accessToken, { method: "POST" });
  } catch {
    // Non-blocking: signup initialization is best-effort
  }
}

async function applyLocalePrefsViaApi(
  accessToken: string,
  localePrefs: { timezone: string; timeFormat: "12h" | "24h" },
): Promise<void> {
  try {
    await postAuthApiRequest(API_ROUTES.ME_SETTINGS, accessToken, {
      body: JSON.stringify({
        onlyIfNewSignup: true,
        timeFormat: localePrefs.timeFormat,
        timezone: localePrefs.timezone,
      }),
      method: "PATCH",
    });
  } catch {
    // Non-blocking: signup locale seeding is best-effort
  }
}

/**
 * Hop 2 of the webapp's OAuth-BFF exchange.
 *
 * Landing point for the API's `/oauth2/authorize` redirect (see /auth/callback
 * for hop 1). Exchanges the authorization code for the webapp's own session —
 * independent of Better Auth's native cookie — and mints the encrypted,
 * first-party `bondery_webapp_session` cookie.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const webappOrigin = getWebappPublicOrigin(buildWebappRuntimeConfigFromEnv());
  const loginUrl = `${webappOrigin}${WEBAPP_ROUTES.LOGIN}?error=oauth`;

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const flowCookie = request.headers
    .get("cookie")
    ?.split("; ")
    .find((entry) => entry.startsWith(`${OAUTH_FLOW_COOKIE}=`))
    ?.slice(OAUTH_FLOW_COOKIE.length + 1);

  const flow = flowCookie ? await decryptOAuthFlow(flowCookie) : null;

  if (!code || !state || !flow || flow.state !== state) {
    return NextResponse.redirect(loginUrl);
  }

  const redirectUri = `${webappOrigin}/auth/oauth-callback`;
  const session = await completeOAuthCodeExchange({
    code,
    codeVerifier: flow.codeVerifier,
    redirectUri,
  });

  if (!session) {
    return NextResponse.redirect(loginUrl);
  }

  const safeRedirectPath =
    flow.redirectTo && isSafeReturnPath(flow.redirectTo) ? flow.redirectTo : null;
  const postLoginUrl = safeRedirectPath
    ? `${webappOrigin}${safeRedirectPath}`
    : `${webappOrigin}${WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN}`;

  const response = NextResponse.redirect(postLoginUrl);

  const sessionCookie = await encryptWebappSession(session);
  response.cookies.set(
    WEBAPP_SESSION_COOKIE,
    sessionCookie,
    webappSessionCookieOptions(webappOrigin.startsWith("https://")),
  );
  response.cookies.set(OAUTH_FLOW_COOKIE, "", { maxAge: 0, path: "/" });

  await initializeUserViaApi(session.accessToken);

  const requestCookieHeader = request.headers.get("cookie") ?? "";
  const localePrefsRaw = requestCookieHeader
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_PREFS_COOKIE}=`))
    ?.slice(LOCALE_PREFS_COOKIE.length + 1);
  const localePrefs = parseLocalePrefs(localePrefsRaw);

  if (localePrefs) {
    await applyLocalePrefsViaApi(session.accessToken, localePrefs);
    response.cookies.set(LOCALE_PREFS_COOKIE, "", { maxAge: 0, path: "/" });
  }

  if (shouldBypassOnboardingForReturnPath(safeRedirectPath)) {
    response.cookies.set(BYPASS_ONBOARDING_ONCE_COOKIE, "1", {
      maxAge: 60,
      path: "/app",
    });
  }

  return response;
}
