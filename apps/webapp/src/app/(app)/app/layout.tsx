import { AppShell, AppShellMain, AppShellNavbar } from "@mantine/core";
import { NavigationSidebarContent } from "./components/NavigationSidebar";
import { LocaleProvider } from "@/components/UserLocaleProvider";
import { getApiUrl } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/config";
import * as translations from "@bondery/translations";

/**
 * Fetches user settings and data from the internal API.
 */
async function getUserSettings() {
  try {
    const baseUrl = getApiUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${baseUrl}/api/settings`, {
      cache: "no-store",
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      const settings = result?.data || {};

      const firstName = settings.name || "";

      return {
        userName: firstName || settings.email || "User",
        avatarUrl: settings.avatar_url || null,
        locale: settings.language || "en",
        timezone: settings.timezone || "UTC",
      };
    }
  } catch (error) {}

  return {
    userName: "User",
    avatarUrl: null,
    locale: "en",
    timezone: "UTC",
  };
}

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  const { userName, avatarUrl, locale, timezone } = await getUserSettings();

  const messages = translations[locale as keyof typeof translations] || translations.en;

  return (
    <LocaleProvider locale={locale} timezone={timezone} messages={messages}>
      <AppShell
        padding="md"
        navbar={{
          width: 280,
          breakpoint: "sm",
        }}
      >
        <AppShellNavbar p="md">
          <NavigationSidebarContent userName={userName} avatarUrl={avatarUrl} />
        </AppShellNavbar>
        <AppShellMain>{children}</AppShellMain>
      </AppShell>
    </LocaleProvider>
  );
}
