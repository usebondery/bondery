import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";
import { Box } from "@mantine/core";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { SidebarChatPanel } from "@/components/shell/SidebarChatPanel";
import { serverApiFetch } from "@/lib/api/server";
import { getAppNavigationTranslations } from "@/lib/i18n/generated/hooks.server";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { staticPageTitle } from "@/lib/metadata/pageTitles";
import { getQueryClient } from "@/lib/query/client";
import { settingsKeys } from "@/lib/query/keys";
import { prefetchChatSessions, prefetchSubscription } from "@/lib/query/prefetch";
import { ChatClient } from "./ChatClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getAppNavigationTranslations();
  return staticPageTitle(t("Chat"));
}

/** Chat layout — prefetches sessions, settings, and subscription into TanStack Query. */
export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await resolveLocaleSettings();
  await preloadWebNamespaces(locale, ["web.chat"]);

  const queryClient = getQueryClient();

  try {
    await Promise.all([prefetchChatSessions(queryClient), prefetchSubscription(queryClient)]);

    const subscriptionStatus = queryClient.getQueryData<SubscriptionStatus | null>(
      settingsKeys.subscription(),
    );

    if (subscriptionStatus?.plan !== "premium") {
      serverApiFetch(API_ROUTES.SUBSCRIPTIONS_SYNC, { method: "POST" }).catch(() => {});
    }
  } catch {}

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Box
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minHeight: "100%",
        }}
      >
        <Box
          hiddenFrom="sm"
          p="sm"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
            display: "flex",
            flex: "0 1 auto",
            flexDirection: "column",
            maxHeight: "40%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <SidebarChatPanel />
        </Box>
        <Box
          style={{
            display: "flex",
            flex: "1 0 auto",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {children}
          <ChatClient />
        </Box>
      </Box>
    </HydrationBoundary>
  );
}
