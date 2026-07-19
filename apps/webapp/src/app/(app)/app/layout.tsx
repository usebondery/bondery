import { WEBAPP_NAME } from "@bondery/helpers/globals/paths";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShellRefreshRegistrar } from "@/components/shell/AppShellRefreshRegistrar";
import { AppShellWithQueryBadges } from "@/components/shell/AppShellWithQueryBadges";
import { AppShellWrapper } from "@/components/shell/AppShellWrapper";
import { ColorSchemeSync } from "@/components/shell/ColorSchemeSync";
import { SessionResyncOnFocus } from "@/components/shell/SessionResyncOnFocus";
import { UserSessionProvider } from "@/components/shell/UserSessionProvider";
import { getAppSession } from "@/lib/app/getAppSession";
import { BYPASS_ONBOARDING_ONCE_COOKIE } from "@/lib/auth/constants";
import { resolveServerSession, signOutServerSession } from "@/lib/auth/resolveServerSession";
import {
  buildLoginUrl,
  buildUnavailableUrl,
  getRequestReturnPath,
  getRequestReturnPathForLogin,
} from "@/lib/auth/returnIntent";
import "leaflet/dist/leaflet.css";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { EnrichResumeDetector } from "@/components/extension/EnrichResumeDetector";
import { EnrichStatusNotificationManager } from "@/components/extension/EnrichStatusNotificationManager";
import { ExtensionUpdateNotificationManager } from "@/components/extension/ExtensionUpdateNotificationManager";
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration";
import { SIDEBAR_COOKIE_NAME } from "@/lib/cookies/constants";

/** Sync fallback while per-route generateMetadata streams on client navigation. */
export const metadata: Metadata = {
  title: WEBAPP_NAME,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";
  const returnPathForLogin = getRequestReturnPathForLogin(headersList);
  const returnPathForUnavailable = getRequestReturnPath(headersList);

  const session = await resolveServerSession();

  if (session.status !== "ok") {
    await signOutServerSession();
    redirect(buildLoginUrl(returnPathForLogin));
  }

  // getAppSession() is cache()-wrapped: shared with resolveLocaleSettings().
  const appSession = await getAppSession();

  if (appSession.status === "unauthorized") {
    // Supabase session is valid but API rejected the token — do not sign out (config mismatch).
    redirect(buildUnavailableUrl(returnPathForUnavailable));
  }

  if (appSession.status === "unavailable") {
    if (!pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
      redirect(buildUnavailableUrl(returnPathForUnavailable));
    }
    return <>{children}</>;
  }

  if (pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
    redirect(WEBAPP_ROUTES.HOME);
  }

  const { session: userSession } = appSession;
  const bypassOnboarding = cookieStore.get(BYPASS_ONBOARDING_ONCE_COOKIE)?.value === "1";

  if (bypassOnboarding) {
    cookieStore.set(BYPASS_ONBOARDING_ONCE_COOKIE, "", { maxAge: 0, path: "/app" });
  }

  if (
    !userSession.onboardingCompletedAt &&
    !bypassOnboarding &&
    !pathname.startsWith(WEBAPP_ROUTES.ONBOARDING)
  ) {
    redirect(WEBAPP_ROUTES.ONBOARDING);
  }

  if (userSession.onboardingCompletedAt && pathname.startsWith(WEBAPP_ROUTES.ONBOARDING)) {
    redirect(WEBAPP_ROUTES.HOME);
  }

  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === "true";
  const { displayName, avatarUrl, colorScheme } = userSession;

  return (
    <UserSessionProvider avatarUrl={avatarUrl} colorScheme={colorScheme} displayName={displayName}>
      <AppShellRefreshRegistrar />
      <SessionResyncOnFocus />
      <ServiceWorkerRegistration />
      <ColorSchemeSync />
      <EnrichStatusNotificationManager />
      <EnrichResumeDetector />
      <ExtensionUpdateNotificationManager />
      <Suspense
        fallback={
          <AppShellWrapper
            avatarUrl={avatarUrl}
            hasActiveMergeRecommendations={false}
            hasOverdueKeepInTouch={false}
            initialCollapsed={initialCollapsed}
            userName={displayName}
          >
            {children}
          </AppShellWrapper>
        }
      >
        <AppShellWithQueryBadges initialCollapsed={initialCollapsed}>
          {children}
        </AppShellWithQueryBadges>
      </Suspense>
    </UserSessionProvider>
  );
}
