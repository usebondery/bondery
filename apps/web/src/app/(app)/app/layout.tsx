import { AppShell, AppShellMain, AppShellNavbar } from "@mantine/core";
import { NavigationSidebarContent } from "@/components/NavigationSidebar";
import { getBaseUrl } from "@/lib/config";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getUserData() {
  try {
    const baseUrl = getBaseUrl();
    const headersList = await headers();

    const response = await fetch(`${baseUrl}/api/account`, {
      cache: "no-store",
      headers: headersList,
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    const result = await response.json();
    const user = result.data;

    if (!user) {
      return {
        userName: "User",
        avatarUrl: null,
      };
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
    return {
      userName: "User",
      avatarUrl: null,
    };
  }
}

/**
 * Force dynamic rendering for all authenticated routes
 * These routes require headers() for authentication checks
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { userName, avatarUrl } = await getUserData();

  return (
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
  );
}
