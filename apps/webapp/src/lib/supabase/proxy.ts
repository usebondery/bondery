import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { buildLoginUrl, buildPathWithSearch } from "@/lib/auth/returnIntent";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

/**
 * Synchronizes Supabase auth cookies for the current request and applies route-based redirects.
 *
 * @param request - Incoming Next.js request used for auth checks and route evaluation.
 * @param requestHeaders - Optional request headers forwarded to NextResponse.next for middleware context.
 * @returns A NextResponse that preserves Supabase session cookies.
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

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
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

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  // 1. If no user and trying to access protected routes (/app/*), redirect to login
  if (!user && request.nextUrl.pathname.startsWith(WEBAPP_ROUTES.APP_GROUP)) {
    const returnPath = buildPathWithSearch(request.nextUrl.pathname, request.nextUrl.search);
    const loginUrl = new URL(buildLoginUrl(returnPath), request.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect /app to the default app page
  if (user && request.nextUrl.pathname === WEBAPP_ROUTES.APP_GROUP) {
    const url = request.nextUrl.clone();
    url.pathname = WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN;
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
