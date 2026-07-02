import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { LOCALE_PREFS_COOKIE } from "@/lib/auth/detectLocale";
import { serverApiFetch } from "@/lib/api/server";

/**
 * Parses the locale preferences cookie set during OAuth login.
 * Returns null if the cookie is missing or invalid.
 */
function parseLocalePrefs(
  raw: string | undefined,
): { timezone: string; timeFormat: "12h" | "24h" } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    const timezone = typeof parsed.timezone === "string" ? parsed.timezone.trim() : null;
    const timeFormat =
      parsed.timeFormat === "12h" || parsed.timeFormat === "24h" ? parsed.timeFormat : null;
    if (!timezone || !timeFormat) return null;
    return { timezone, timeFormat };
  } catch {
    return null;
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone: localePrefs.timezone,
          timeFormat: localePrefs.timeFormat,
          onlyIfNewSignup: true,
        }),
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

  if (code) {
    const cookieStore = await cookies();
    const redirectPath = requestUrl.searchParams.get("redirect");
    const postLoginUrl =
      redirectPath && redirectPath.startsWith("/") ? `${origin}${redirectPath}` : `${origin}/app`;

    const response = NextResponse.redirect(postLoginUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
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
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const localePrefsRaw = cookieStore.get(LOCALE_PREFS_COOKIE)?.value;
      const localePrefs = parseLocalePrefs(localePrefsRaw);

      if (localePrefs) {
        await applyLocalePrefsViaApi(localePrefs);
        response.cookies.set(LOCALE_PREFS_COOKIE, "", { path: "/", maxAge: 0 });
      }

      return response;
    } else {
      console.error("Error exchanging code for session:", error.message);
    }
  }

  return NextResponse.redirect(`${origin}${WEBAPP_ROUTES.LOGIN}`);
}
