import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookieOptions";

function copyResponseCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

function redirectWithSupabaseCookies(
  url: URL | string,
  supabaseResponse: NextResponse,
): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  copyResponseCookies(supabaseResponse, redirectResponse);
  return redirectResponse;
}

/**
 * Refreshes Supabase auth cookies for the current request.
 *
 * Route protection for /app/* is handled in app/layout.tsx (single gate).
 * This layer only refreshes tokens and applies benign redirects.
 */
export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const buildNextResponse = () =>
    NextResponse.next({
      request: requestHeaders
        ? {
            headers: requestHeaders,
          }
        : request,
    });

  let supabaseResponse = buildNextResponse();
  const cfg = buildWebappRuntimeConfigFromEnv();

  const supabase = createServerClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = buildNextResponse();
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh session cookies — must run on every matched request.
  await supabase.auth.getClaims();

  // Canonical /app → /app/home when already authenticated.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && request.nextUrl.pathname === WEBAPP_ROUTES.APP_GROUP) {
    const url = request.nextUrl.clone();
    url.pathname = WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN;
    return redirectWithSupabaseCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}
