import {
  dehydrate,
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import type { QueryClient, QueryKey, QueryFunction } from "@tanstack/react-query";
import { getQueryClient } from "./client";

export async function prefetchQuery<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  queryFn: QueryFunction<T>,
): Promise<void> {
  await queryClient.prefetchQuery({ queryKey, queryFn });
}

export function dehydrateQueryClient(queryClient: QueryClient): DehydratedState {
  return dehydrate(queryClient);
}

export function getServerQueryClient(): QueryClient {
  return getQueryClient();
}

export { HydrationBoundary };
