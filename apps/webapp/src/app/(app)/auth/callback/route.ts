import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { LOCALE_PREFS_COOKIE } from "@/lib/auth/detectLocale";

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
      // Apply detected locale preferences (timezone, time format) to the user's settings,
      // but only for new signups — not for returning users who may have changed their settings.
      // We detect a new signup by checking if user_settings was created in the last 30 seconds.
      const localePrefsRaw = cookieStore.get(LOCALE_PREFS_COOKIE)?.value;
      const localePrefs = parseLocalePrefs(localePrefsRaw);

      if (localePrefs) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: settings } = await supabase
            .from("user_settings")
            .select("created_at")
            .eq("user_id", user.id)
            .single();

          const isNewSignup =
            settings?.created_at && Date.now() - new Date(settings.created_at).getTime() < 30_000;

          if (isNewSignup) {
            await supabase
              .from("user_settings")
              .update({
                timezone: localePrefs.timezone,
                time_format: localePrefs.timeFormat,
              })
              .eq("user_id", user.id);
          }
        }

        // Clear the cookie — it's no longer needed
        response.cookies.set(LOCALE_PREFS_COOKIE, "", { path: "/", maxAge: 0 });
      }

      return response;
    } else {
      console.error("Error exchanging code for session:", error.message);
    }
  }

  return NextResponse.redirect(`${origin}${WEBAPP_ROUTES.LOGIN}`);
}
