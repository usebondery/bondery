import {
  MutationCache,
  QueryCache,
  QueryClient,
  isServer,
} from "@tanstack/react-query";
import {
  handleUnauthorizedSession,
} from "@/lib/auth/handleUnauthorizedSession";
import { isUnauthorizedApiError } from "@/lib/auth/unauthorized";

function handleUnauthorized(error: unknown): void {
  if (isServer) return;
  if (!isUnauthorizedApiError(error)) return;
  void handleUnauthorizedSession();
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleUnauthorized,
    }),
    mutationCache: new MutationCache({
      onError: handleUnauthorized,
    }),
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isUnauthorizedApiError(error)) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
