import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Database } from "@bondery/schemas/supabase.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BYPASS_ONBOARDING_ONCE_COOKIE } from "@/lib/auth/constants";
import { LOCALE_PREFS_COOKIE } from "@/lib/auth/detectLocale";
import { parseReturnIntent, shouldBypassOnboardingForReturnPath } from "@/lib/auth/returnIntent";
import {
  buildWebappRuntimeConfigFromEnv,
  getWebappPublicOrigin,
} from "@/lib/platform/runtimeConfig.server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookieOptions";

/**
 * Parses the locale preferences cookie set during OAuth login.
 * Returns null if the cookie is missing or invalid.
 */
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
  const { apiBaseUrl } = buildWebappRuntimeConfigFromEnv();
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;

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

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const cfg = buildWebappRuntimeConfigFromEnv();
  const webappOrigin = getWebappPublicOrigin(cfg);
  const safeRedirectPath = parseReturnIntent(requestUrl.searchParams);
  const postLoginUrl = safeRedirectPath
    ? `${webappOrigin}${safeRedirectPath}`
    : `${webappOrigin}${WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN}`;

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(postLoginUrl);

    const supabase = createServerClient<Database>(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (accessToken) {
        await initializeUserViaApi(accessToken);

        const localePrefsRaw = cookieStore.get(LOCALE_PREFS_COOKIE)?.value;
        const localePrefs = parseLocalePrefs(localePrefsRaw);

        if (localePrefs) {
          await applyLocalePrefsViaApi(accessToken, localePrefs);
          response.cookies.set(LOCALE_PREFS_COOKIE, "", { maxAge: 0, path: "/" });
        }
      }

      if (shouldBypassOnboardingForReturnPath(safeRedirectPath)) {
        response.cookies.set(BYPASS_ONBOARDING_ONCE_COOKIE, "1", {
          maxAge: 60,
          path: "/app",
        });
      }

      return response;
    }
  }

  return NextResponse.redirect(`${webappOrigin}${WEBAPP_ROUTES.LOGIN}`);
}
