import { AppShellWrapper } from "./components/AppShellWrapper";
import { AppShellWithQueryBadges } from "./components/AppShellWithQueryBadges";
import { getUserSettings } from "@/lib/user/getUserSettings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(WEBSITE_ROUTES.LOGIN);
  }

  // getUserSettings() is cache()-wrapped: the fetch runs once and is shared with
  // resolveLocaleSettings() in the group layout — no duplicate API calls.
  const [settings, cookieStore, headersList] = await Promise.all([
    getUserSettings(),
    cookies(),
    headers(),
  ]);

  // Route guard: redirect to onboarding if not yet completed.
  // Runs BEFORE the Suspense boundary so AppShellWithBadges (3 heavy fetches)
  // never mounts for onboarding users.
  const pathname = headersList.get("x-pathname") ?? "";
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
      {/*
       * Suspense boundary: show the shell with default (no-badge) state immediately,
       * then replace with actual badge data once the slower parallel fetches resolve.
       */}
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
