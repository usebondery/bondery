import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverApiFetch } from "@/lib/api/server";
import { BYPASS_ONBOARDING_ONCE_COOKIE } from "@/lib/auth/constants";
import { LOCALE_PREFS_COOKIE } from "@/lib/auth/detectLocale";
import {
  parseReturnIntent,
  shouldBypassOnboardingForReturnPath,
} from "@/lib/auth/returnIntent";
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from "@/lib/platform/config";

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

async function initializeUserViaApi(): Promise<void> {
  try {
    await serverApiFetch(API_ROUTES.ME_INITIALIZE, { method: "POST" }, { transportPolicy: false });
  } catch {
    // Non-blocking: signup initialization is best-effort
  }
}

async function applyLocalePrefsViaApi(localePrefs: {
  timezone: string;
  timeFormat: "12h" | "24h";
}): Promise<void> {
  try {
    await serverApiFetch(
      API_ROUTES.ME_SETTINGS,
      {
        body: JSON.stringify({
          onlyIfNewSignup: true,
          timeFormat: localePrefs.timeFormat,
          timezone: localePrefs.timezone,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      },
      { transportPolicy: false },
    );
  } catch {
    // Non-blocking: signup locale seeding is best-effort
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const safeRedirectPath = parseReturnIntent(requestUrl.searchParams);
  const postLoginUrl = safeRedirectPath
    ? `${origin}${safeRedirectPath}`
    : `${origin}${WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN}`;

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(postLoginUrl);

    const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
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
      await initializeUserViaApi();

      const localePrefsRaw = cookieStore.get(LOCALE_PREFS_COOKIE)?.value;
      const localePrefs = parseLocalePrefs(localePrefsRaw);

      if (localePrefs) {
        await applyLocalePrefsViaApi(localePrefs);
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
  }

  return NextResponse.redirect(`${origin}${WEBAPP_ROUTES.LOGIN}`);
}
