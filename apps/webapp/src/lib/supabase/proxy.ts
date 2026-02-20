import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

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

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = buildNextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  // 1. If user is logged in and visiting login page, redirect to app
  if (user && request.nextUrl.pathname.startsWith(WEBAPP_ROUTES.LOGIN)) {
    const url = request.nextUrl.clone();
    url.pathname = WEBAPP_ROUTES.DEFAULT_PAGE_AFTER_LOGIN;
    return NextResponse.redirect(url);
  }

  // 2. If no user and trying to access protected routes (/app/*), redirect to login
  if (!user && request.nextUrl.pathname.startsWith(WEBAPP_ROUTES.APP_GROUP)) {
    const url = request.nextUrl.clone();
    url.pathname = WEBAPP_ROUTES.LOGIN;
    return NextResponse.redirect(url);
  }

  // 3. Redirect /app to the default app page
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
