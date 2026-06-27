import { AppShellWrapper } from "./components/AppShellWrapper";
import { getAuthHeaders } from "@/lib/authHeaders";
import { getUserSettings } from "@/lib/user/getUserSettings";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { API_ROUTES, WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { API_URL } from "@/lib/config";
import { ColorSchemeSync } from "./components/ColorSchemeSync";
import type { Contact, MergeRecommendation } from "@bondery/schemas";
import { getMergeRecommendationsData } from "./fix/getMergeRecommendationsData";
import { getKeepInTouchData } from "./keep-in-touch/getKeepInTouchData";
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
        <AppShellWithBadges
          userName={userName}
          avatarUrl={avatarUrl}
          initialCollapsed={initialCollapsed}
        >
          {children}
        </AppShellWithBadges>
      </Suspense>
    </>
  );
}

/**
 * Async server component that fetches sidebar badge indicator data in parallel
 * and renders the full app shell. Consumed inside a Suspense boundary so that
 * the shell structure is visible while these slower fetches are in-flight.
 */
async function AppShellWithBadges({
  userName,
  avatarUrl,
  initialCollapsed,
  children,
}: {
  userName: string;
  avatarUrl: string | null;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const headers = await getAuthHeaders();

  const [recommendations, keepInTouchData, enrichEligibleRes] = await Promise.all([
    getMergeRecommendationsData(headers).catch(() => [] as MergeRecommendation[]),
    getKeepInTouchData(headers).catch(() => ({ contacts: [] as Contact[] })),
    fetch(`${API_URL}${API_ROUTES.CONTACTS}/enrich-queue/eligible-count`, { headers }).catch(
      () => null,
    ),
  ]);

  let enrichEligibleCount = 0;
  if (enrichEligibleRes?.ok) {
    const data = await enrichEligibleRes.json();
    enrichEligibleCount = data.count ?? 0;
  }

  const hasActiveMergeRecommendations = recommendations.length > 0 || enrichEligibleCount > 0;
  const hasOverdueKeepInTouch = keepInTouchData.contacts.some((c) => {
    if (!c.keepFrequencyDays || !c.lastInteraction) return true;
    const nextDue = new Date(c.lastInteraction);
    nextDue.setDate(nextDue.getDate() + c.keepFrequencyDays);
    return nextDue <= new Date();
  });

  return (
    <AppShellWrapper
      userName={userName}
      avatarUrl={avatarUrl}
      initialCollapsed={initialCollapsed}
      hasActiveMergeRecommendations={hasActiveMergeRecommendations}
      hasOverdueKeepInTouch={hasOverdueKeepInTouch}
    >
      {children}
    </AppShellWrapper>
  );
}
