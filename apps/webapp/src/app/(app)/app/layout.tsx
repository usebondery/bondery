import { AppShell, AppShellMain, AppShellNavbar } from "@mantine/core";
import { NavigationSidebarContent } from "@/components/NavigationSidebar";
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
      console.log("Layout - API Response:", JSON.stringify(result, null, 2));
      const settings = result?.data || {};
      console.log("Layout - Settings data:", JSON.stringify(settings, null, 2));

      const firstName = settings.name || "";
      const middleName = settings.middlename || "";
      const lastName = settings.surname || "";
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

      console.log("Layout - Computed values:", {
        firstName,
        middleName,
        lastName,
        fullName,
        email: settings.email,
        avatar_url: settings.avatar_url,
      });

      return {
        userName: fullName || settings.email || "User",
        avatarUrl: settings.avatar_url || null,
        locale: settings.language || "en",
        timezone: settings.timezone || "UTC",
      };
    } else {
      console.error("Layout - API response not OK:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Error fetching user settings:", error);
  }

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

  console.log("Layout - User data:", { userName, avatarUrl, locale, timezone });

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
