import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { serverApiFetch } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query/client";
import { settingsKeys } from "@/lib/query/keys";
import {
  prefetchApiKeys,
  prefetchMePerson,
  prefetchSubscription,
  prefetchTagsList,
} from "@/lib/query/prefetch";
import { SETTINGS_TAGS_PREVIEW } from "@/lib/query/settingsPageQueryParams";
import { SettingsClient } from "./SettingsClient";

export async function SettingsLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchTagsList(queryClient, SETTINGS_TAGS_PREVIEW),

    prefetchMePerson(queryClient, "small"),

    prefetchSubscription(queryClient),

    prefetchApiKeys(queryClient),
  ]);

  const subscriptionStatus = queryClient.getQueryData<SubscriptionStatus | null>(
    settingsKeys.subscription(),
  );

  if (subscriptionStatus?.plan !== "premium") {
    serverApiFetch(API_ROUTES.SUBSCRIPTIONS_SYNC, { method: "POST" }).catch(() => {});
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsClient />
    </HydrationBoundary>
  );
}
