import { AppShellWrapper } from "./components/AppShellWrapper";
import { AppShellWithQueryBadges } from "./components/AppShellWithQueryBadges";
import { getAppBootstrap } from "@/lib/app/getAppBootstrap";
import {
  resolveServerSession,
  signOutServerSession,
} from "@/lib/auth/resolveServerSession";
import { redirect } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { ColorSchemeSync } from "./components/ColorSchemeSync";
import { EnrichStatusNotificationManager } from "@/lib/extension/EnrichStatusNotificationManager";
import { EnrichResumeDetector } from "@/lib/extension/EnrichResumeDetector";
import { ExtensionUpdateNotificationManager } from "@/lib/extension/ExtensionUpdateNotificationManager";
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration";
import { Suspense } from "react";
import { cookies, headers } from "next/headers";

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

  const { settings } = bootstrap;

  if (!settings.onboardingCompletedAt && !pathname.startsWith(WEBAPP_ROUTES.ONBOARDING)) {
    redirect(WEBAPP_ROUTES.ONBOARDING);
  }

  const initialCollapsed = cookieStore.get("bondery-sidebar-collapsed")?.value === "true";
  const { userName, avatarUrl, colorScheme } = settings;

  return (
    <>
      <ServiceWorkerRegistration />
      <ColorSchemeSync colorScheme={colorScheme} />
      <EnrichStatusNotificationManager />
      <EnrichResumeDetector />
      <ExtensionUpdateNotificationManager />
      <Suspense
        fallback={
          <AppShellWrapper
            userName={userName}
            avatarUrl={avatarUrl}
            initialCollapsed={initialCollapsed}
            hasActiveMergeRecommendations={false}
            hasOverdueKeepInTouch={false}
          >
            {children}
          </AppShellWrapper>
        }
      >
        <AppShellWithQueryBadges
          userName={userName}
          avatarUrl={avatarUrl}
          initialCollapsed={initialCollapsed}
        >
          {children}
        </AppShellWithQueryBadges>
      </Suspense>
    </>
  );
}
