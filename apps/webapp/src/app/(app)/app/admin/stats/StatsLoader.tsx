import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { prefetchAdminStatsDashboard } from "@/lib/query/prefetch";

import { StatsClient } from "./StatsClient";

export async function StatsLoader() {
  const queryClient = getQueryClient();

  await prefetchAdminStatsDashboard(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatsClient />
    </HydrationBoundary>
  );
}
