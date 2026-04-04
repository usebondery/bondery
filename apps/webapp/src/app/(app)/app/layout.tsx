import { AppShell, AppShellMain, AppShellNavbar } from "@mantine/core";
import { NavigationSidebarContent } from "./components/NavigationSidebar";
import { LocaleProvider } from "@/app/(app)/app/components/UserLocaleProvider";
import { getAuthHeaders } from "@/lib/authHeaders";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import * as translations from "@bondery/translations";
import "leaflet/dist/leaflet.css";
import { API_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { API_URL } from "@/lib/config";
import { ColorSchemeSync } from "./components/ColorSchemeSync";
import type { ColorSchemePreference, Contact, MergeRecommendation } from "@bondery/types";
import { getMergeRecommendationsData } from "./fix/getMergeRecommendationsData";
import { getKeepInTouchData } from "./keep-in-touch/getKeepInTouchData";
import { EnrichStatusNotificationManager } from "@/lib/extension/EnrichStatusNotificationManager";
import { EnrichResumeDetector } from "@/lib/extension/EnrichResumeDetector";
import { ExtensionUpdateNotificationManager } from "@/lib/extension/ExtensionUpdateNotificationManager";
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration";

interface UserSettingsLayoutData {
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  timeFormat: "24h" | "12h";
  colorScheme: ColorSchemePreference;
}

/**
 * Fetches user settings and data from the internal API.
 *
 * @param precomputedHeaders - Optional pre-fetched auth headers to avoid redundant getAuthHeaders() calls.
 */
async function getUserSettings(precomputedHeaders?: HeadersInit) {
  try {
    const headers = precomputedHeaders ?? (await getAuthHeaders());

    const response = await fetch(`${API_URL}${API_ROUTES.ME_SETTINGS}`, {
      next: { tags: ["settings"] },
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      const settings = result?.data || {};

      const firstName = settings.name || "";

      const colorScheme: ColorSchemePreference =
        settings.colorScheme === "light" ||
        settings.colorScheme === "dark" ||
        settings.colorScheme === "auto"
          ? settings.colorScheme
          : "auto";

      return {
        userName: firstName || settings.email || "User",
        userEmail: settings.email || "",
        avatarUrl: settings.avatarUrl || null,
        locale: "en",
        timezone: settings.timezone || "UTC",
        timeFormat: settings.timeFormat === "12h" ? "12h" : "24h",
        colorScheme,
      } satisfies UserSettingsLayoutData;
    }
  } catch (error) {}

  return {
    userName: "User",
    userEmail: "",
    avatarUrl: null,
    locale: "en",
    timezone: "UTC",
    timeFormat: "24h",
    colorScheme: "auto",
  } satisfies UserSettingsLayoutData;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(WEBSITE_ROUTES.LOGIN);
  }

  // Fetch auth headers once, then parallelise both independent API calls
  const headers = await getAuthHeaders();

  const [settings, recommendations, keepInTouchData, enrichEligibleRes] = await Promise.all([
    getUserSettings(headers),
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

  const { userName, userEmail, avatarUrl, locale, timezone, timeFormat, colorScheme } = settings;
  const hasActiveMergeRecommendations = recommendations.length > 0 || enrichEligibleCount > 0;
  const hasOverdueKeepInTouch = keepInTouchData.contacts.some((c) => {
    if (!c.keepFrequencyDays || !c.lastInteraction) return true;
    const nextDue = new Date(c.lastInteraction);
    nextDue.setDate(nextDue.getDate() + c.keepFrequencyDays);
    return nextDue <= new Date();
  });

  const messages = translations[locale as keyof typeof translations] || translations.en;

  return (
    <LocaleProvider locale={locale} timezone={timezone} timeFormat={timeFormat} messages={messages}>
      <ServiceWorkerRegistration />
      <ColorSchemeSync colorScheme={colorScheme} />
      <EnrichStatusNotificationManager />
      <EnrichResumeDetector />
      <ExtensionUpdateNotificationManager />
      <AppShell
        padding="md"
        navbar={{
          width: 280,
          breakpoint: "sm",
        }}
      >
        <AppShellNavbar p="md">
          <NavigationSidebarContent
            userName={userName}
            userEmail={userEmail}
            avatarUrl={avatarUrl}
            hasActiveMergeRecommendations={hasActiveMergeRecommendations}
            hasOverdueKeepInTouch={hasOverdueKeepInTouch}
          />
        </AppShellNavbar>
        <AppShellMain>{children}</AppShellMain>
      </AppShell>
    </LocaleProvider>
  );
}
