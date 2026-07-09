import { WEBAPP_NAME } from "@bondery/helpers/globals/paths";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShellWithQueryBadges } from "@/components/shell/AppShellWithQueryBadges";
import { AppShellWrapper } from "@/components/shell/AppShellWrapper";
import { getAppBootstrap } from "@/lib/app/getAppBootstrap";
import { resolveServerSession, signOutServerSession } from "@/lib/auth/resolveServerSession";
import { SettingsCacheSeed } from "@/lib/query/SettingsCacheSeed";
import "leaflet/dist/leaflet.css";
import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { EnrichResumeDetector } from "@/components/extension/EnrichResumeDetector";
import { EnrichStatusNotificationManager } from "@/components/extension/EnrichStatusNotificationManager";
import { ExtensionUpdateNotificationManager } from "@/components/extension/ExtensionUpdateNotificationManager";
import { ColorSchemeSync } from "@/components/shell/ColorSchemeSync";
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration";
import { SIDEBAR_COOKIE_NAME } from "@/lib/cookies/constants";

/** Sync fallback while per-route generateMetadata streams on client navigation. */
export const metadata: Metadata = {
  title: WEBAPP_NAME,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await resolveServerSession();

  if (session.status !== "ok") {
    await signOutServerSession();
    redirect(WEBSITE_ROUTES.LOGIN);
  }

  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";

  // getAppBootstrap() is cache()-wrapped: shared with resolveLocaleSettings().
  const bootstrap = await getAppBootstrap();

  if (bootstrap.status === "unauthorized") {
    await signOutServerSession();
    redirect(WEBSITE_ROUTES.LOGIN);
  }

  if (bootstrap.status === "unavailable") {
    if (!pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
      redirect(WEBAPP_ROUTES.UNAVAILABLE);
    }
    return <>{children}</>;
  }

  if (pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
    redirect(WEBAPP_ROUTES.HOME);
  }

  const { settings, settingsQueryData } = bootstrap;

  if (!settings.onboardingCompletedAt && !pathname.startsWith(WEBAPP_ROUTES.ONBOARDING)) {
    redirect(WEBAPP_ROUTES.ONBOARDING);
  }

  const initialCollapsed = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value === "true";
  const { userName, avatarUrl, colorScheme } = settings;

  return (
    <>
      <SettingsCacheSeed data={settingsQueryData} />
      <ServiceWorkerRegistration />
      <ColorSchemeSync colorScheme={colorScheme} />
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
            userName={userName}
          >
            {children}
          </AppShellWrapper>
        }
      >
        <AppShellWithQueryBadges
          avatarUrl={avatarUrl}
          initialCollapsed={initialCollapsed}
          userName={userName}
        >
          {children}
        </AppShellWithQueryBadges>
      </Suspense>
    </>
  );
}
