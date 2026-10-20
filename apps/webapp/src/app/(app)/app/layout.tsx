import { WEBAPP_NAME, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { BYPASS_ONBOARDING_ONCE_COOKIE } from "@/lib/auth/constants";
import { getRequestSession } from "@/lib/auth/getRequestSession";
import { signOutServerSession } from "@/lib/auth/resolveServerSession";
import { getRequestReturnPathForLogin } from "@/lib/auth/returnIntent";
import { redirectRoute } from "@/lib/navigation/redirect/route";
import { routeAssert } from "@/lib/navigation/route/assert";
import { routeLogin } from "@/lib/navigation/route/login";

/** Sync fallback while per-route generateMetadata streams on client navigation. */
export const metadata: Metadata = {
  title: WEBAPP_NAME,
};

/**
 * Auth gate for all `/app/*` routes. Product chrome (sidebar, shell providers)
 * lives in `(shell)/layout.tsx`; system pages use `(chromeless)/layout.tsx`.
 *
 * Identity only — hop failures stay on the current URL and degrade in the shell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";
  const returnPathForLogin = getRequestReturnPathForLogin(headersList);

  const session = await getRequestSession();

  if (session.kind === "anonymous") {
    await signOutServerSession();
    redirectRoute(routeLogin(returnPathForLogin));
  }

  if (pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
    redirectRoute(routeAssert(WEBAPP_ROUTES.HOME));
  }

  if (session.api === "ok" && session.shell) {
    const bypassOnboarding = cookieStore.get(BYPASS_ONBOARDING_ONCE_COOKIE)?.value === "1";
    const userSession = session.shell;

    if (
      !userSession.onboardingCompletedAt &&
      !bypassOnboarding &&
      !pathname.startsWith(WEBAPP_ROUTES.ONBOARDING)
    ) {
      redirectRoute(routeAssert(WEBAPP_ROUTES.ONBOARDING));
    }

    if (userSession.onboardingCompletedAt && pathname.startsWith(WEBAPP_ROUTES.ONBOARDING)) {
      redirectRoute(routeAssert(WEBAPP_ROUTES.HOME));
    }
  }

  return <>{children}</>;
}
