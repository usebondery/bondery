import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import {
  fetchSettings,
  prefetchApiKeys,
  prefetchMcpConsents,
  prefetchMePerson,
  prefetchOAuthProviders,
  prefetchSubscription,
  prefetchTagsList,
} from "@/lib/query/prefetch";
import { SETTINGS_TAGS_PREVIEW } from "@/lib/query/settingsPageQueryParams";
import { SettingsClient } from "./SettingsClient";

export async function SettingsLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    fetchSettings(queryClient),
    prefetchTagsList(queryClient, SETTINGS_TAGS_PREVIEW),
    prefetchMePerson(queryClient, "small"),
    prefetchApiKeys(queryClient),
    prefetchMcpConsents(queryClient),
    prefetchSubscription(queryClient),
    prefetchOAuthProviders(queryClient),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsClient />
    </HydrationBoundary>
  );
}
