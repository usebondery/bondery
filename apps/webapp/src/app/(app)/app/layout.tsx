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
import type { ColorSchemePreference } from "@bondery/types";

interface UserSettingsLayoutData {
  userName: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  colorScheme: ColorSchemePreference;
}

/**
 * Fetches user settings and data from the internal API.
 */
async function getUserSettings() {
  try {
    const headers = await getAuthHeaders();

    const response = await fetch(`${API_URL}${API_ROUTES.SETTINGS}`, {
      next: { tags: ["settings"] },
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      const settings = result?.data || {};

      const firstName = settings.name || "";

      const colorScheme: ColorSchemePreference =
        settings.color_scheme === "light" ||
        settings.color_scheme === "dark" ||
        settings.color_scheme === "auto"
          ? settings.color_scheme
          : "auto";

      return {
        userName: firstName || settings.email || "User",
        avatarUrl: settings.avatar_url || null,
        locale: settings.language || "en",
        timezone: settings.timezone || "UTC",
        colorScheme,
      } satisfies UserSettingsLayoutData;
    }
  } catch (error) {}

  return {
    userName: "User",
    avatarUrl: null,
    locale: "en",
    timezone: "UTC",
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

  const { userName, avatarUrl, locale, timezone, colorScheme } = await getUserSettings();

  const messages = translations[locale as keyof typeof translations] || translations.en;

  return (
    <LocaleProvider locale={locale} timezone={timezone} messages={messages}>
      <ColorSchemeSync colorScheme={colorScheme} />
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
