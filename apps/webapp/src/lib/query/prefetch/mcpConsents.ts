import type { QueryClient } from "@tanstack/react-query";
import { getMcpConsentsServer } from "@/lib/api/domains/server/mcpConsents";
import { settingsKeys } from "@/lib/query/keys";

export async function prefetchMcpConsents(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getMcpConsentsServer(),
    queryKey: settingsKeys.mcpConsents(),
  });
}
