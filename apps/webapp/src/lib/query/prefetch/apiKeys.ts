import type { QueryClient } from "@tanstack/react-query";
import { getApiKeysServer } from "@/lib/api/domains/server/apiKeys";
import { settingsKeys } from "@/lib/query/keys";

export async function prefetchApiKeys(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getApiKeysServer(),
    queryKey: settingsKeys.apiKeys(),
  });
}
