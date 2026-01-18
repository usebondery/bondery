import { AppShell, AppShellMain, AppShellNavbar } from "@mantine/core";
import { NavigationSidebarContent } from "@/components/NavigationSidebar";
import { LocaleProvider } from "@/components/UserLocaleProvider";
import { getBaseUrl } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/config";
import * as translations from "@bondery/translations";

/**
 * Fetches user data from the internal API.
 */
async function getUserData() {
  try {
    const baseUrl = getBaseUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${baseUrl}/api/account`, {
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    const result = await response.json();
    const user = result.data;

    if (!user) {
      return { userName: "User", avatarUrl: null };
    }

    const firstName = user.user_metadata?.name || "";
    const middleName = user.user_metadata?.middlename || "";
    const lastName = user.user_metadata?.surname || "";
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

    return {
      userName: fullName || user.email || "User",
      avatarUrl: user.user_metadata?.avatar_url || null,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return { userName: "User", avatarUrl: null };
  }
}

/**
 * Fetches user locale settings from the internal API.
 */
async function getUserSettings() {
  try {
    const baseUrl = getBaseUrl();
    const headers = await getAuthHeaders();

    const response = await fetch(`${baseUrl}/api/settings`, {
      cache: "no-store",
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      return {
        locale: result?.data?.language || "en",
        timezone: result?.data?.timezone || "UTC",
      };
    }
  } catch (error) {
    console.error("Error fetching user settings:", error);
  }

  return { locale: "en", timezone: "UTC" };
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

  const [{ userName, avatarUrl }, { locale, timezone }] = await Promise.all([
    getUserData(),
    getUserSettings(),
  ]);

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
