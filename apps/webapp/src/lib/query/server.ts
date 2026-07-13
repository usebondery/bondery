import type { QueryClient, QueryFunction, QueryKey } from "@tanstack/react-query";
import { type DehydratedState, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "./client";

export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
): Promise<void> {
  await queryClient.prefetchQuery({ queryFn, queryKey });
}

export function dehydrateQueryClient(queryClient: QueryClient): DehydratedState {
  return dehydrate(queryClient);
}

export function getServerQueryClient(): QueryClient {
  return getQueryClient();
}

export { HydrationBoundary };
