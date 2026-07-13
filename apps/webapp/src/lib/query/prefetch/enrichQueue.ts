import type { QueryClient } from "@tanstack/react-query";
import {
  getEnrichQueueCountServer,
  getEnrichQueueStatusServer,
} from "@/lib/api/domains/server/enrichQueue";
import { enrichQueueKeys } from "@/lib/query/keys";

export async function prefetchEnrichQueueCount(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getEnrichQueueCountServer(),
    queryKey: enrichQueueKeys.count(),
  });
}

export async function prefetchEnrichQueueStatus(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getEnrichQueueStatusServer(),
    queryKey: enrichQueueKeys.status(),
  });
}
