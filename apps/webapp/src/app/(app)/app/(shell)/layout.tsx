import "leaflet/dist/leaflet.css";
import { WEBAPP_NAME, WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PaymentFailureModal } from "@/components/billing/PaymentFailureModal";
import { EnrichResumeDetector } from "@/components/extension/EnrichResumeDetector";
import { EnrichStatusNotificationManager } from "@/components/extension/EnrichStatusNotificationManager";
import { ExtensionUpdateNotificationManager } from "@/components/extension/ExtensionUpdateNotificationManager";
import { AppShellRefreshRegistrar } from "@/components/shell/AppShellRefreshRegistrar";
import { AppShellWithQueryBadges } from "@/components/shell/AppShellWithQueryBadges";
import { AppShellWrapper } from "@/components/shell/AppShellWrapper";
import { ColorSchemeSync } from "@/components/shell/ColorSchemeSync";
import { ProductAnalyticsShellSync } from "@/components/shell/ProductAnalyticsShellSync";
import { ServiceWorkerRegistration } from "@/components/shell/ServiceWorkerRegistration";
import { SyncWakeRegistrar } from "@/components/shell/SyncWakeRegistrar";
import { UserSessionProvider } from "@/components/shell/UserSessionProvider";
import { BYPASS_ONBOARDING_ONCE_COOKIE } from "@/lib/auth/constants";
import { getRequestSession } from "@/lib/auth/getRequestSession";
import { buildLoginUrl, getRequestReturnPathForLogin } from "@/lib/auth/returnIntent";
import {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_LAST_EXPANDED_COOKIE_NAME,
  SIDEBAR_WIDTH_COOKIE_NAME,
} from "@/lib/cookies/constants";
import { parseStoredLastExpandedWidth, parseStoredSidebarWidth } from "@/lib/shell/sidebarWidth";

export const metadata: Metadata = {
  title: WEBAPP_NAME,
};

function resolveShellDisplayName(
  displayName: string | undefined,
  fallbackName: string,
  fallbackEmail: string,
): string {
  if (displayName?.trim()) {
    return displayName;
  }
  if (fallbackName.trim()) {
    return fallbackName;
  }
  return fallbackEmail;
}

/** Authenticated product chrome: sidebar, shell providers, onboarding gate. */
export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, headersList] = await Promise.all([cookies(), headers()]);
  const pathname = headersList.get("x-pathname") ?? "";
  const session = await getRequestSession();

  if (session.kind !== "authenticated") {
    redirect(buildLoginUrl(getRequestReturnPathForLogin(headersList)));
  }

  const shellReady = session.api === "ok" && session.shell !== null;
  const userSession = session.shell;
  const displayName = resolveShellDisplayName(
    userSession?.displayName,
    session.user.name,
    session.user.email,
  );
  const avatarUrl = userSession?.avatarUrl ?? session.user.image ?? null;
  const colorScheme = userSession?.colorScheme ?? "auto";

  if (shellReady && userSession) {
    const bypassOnboarding = cookieStore.get(BYPASS_ONBOARDING_ONCE_COOKIE)?.value === "1";

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
  }

  const initialWidth = parseStoredSidebarWidth(
    cookieStore.get(SIDEBAR_WIDTH_COOKIE_NAME)?.value,
    cookieStore.get(SIDEBAR_COOKIE_NAME)?.value,
  );
  const initialLastExpandedWidth = parseStoredLastExpandedWidth(
    cookieStore.get(SIDEBAR_LAST_EXPANDED_COOKIE_NAME)?.value,
  );

  return (
    <UserSessionProvider avatarUrl={avatarUrl} colorScheme={colorScheme} displayName={displayName}>
      <AppShellRefreshRegistrar />
      <ProductAnalyticsShellSync />
      <SyncWakeRegistrar />
      <ServiceWorkerRegistration />
      <ColorSchemeSync />
      <EnrichStatusNotificationManager />
      <EnrichResumeDetector />
      <ExtensionUpdateNotificationManager />
      <PaymentFailureModal />
      <Suspense
        fallback={
          <AppShellWrapper
            avatarUrl={avatarUrl}
            hasActiveMergeRecommendations={false}
            hasOverdueKeepInTouch={false}
            initialLastExpandedWidth={initialLastExpandedWidth}
            initialWidth={initialWidth}
            userName={displayName}
          >
            {children}
          </AppShellWrapper>
        }
      >
        <AppShellWithQueryBadges
          initialLastExpandedWidth={initialLastExpandedWidth}
          initialWidth={initialWidth}
        >
          {children}
        </AppShellWithQueryBadges>
      </Suspense>
    </UserSessionProvider>
  );
}
