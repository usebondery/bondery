import type { QueryClient } from "@tanstack/react-query";
import { getSettingsServer } from "@/lib/api/domains/server/settings";
import { settingsKeys } from "@/lib/query/keys";

export async function prefetchSettings(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getSettingsServer(),
    queryKey: settingsKeys.me(),
  });
}
