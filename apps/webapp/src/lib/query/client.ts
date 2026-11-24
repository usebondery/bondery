import { environmentManager, QueryClient } from "@tanstack/react-query";
import { isApiUnavailableError } from "@/lib/api/availability";
import { isUnauthorizedApiError } from "@/lib/auth/unauthorized";

let browserQueryClient: QueryClient | undefined;

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (isUnauthorizedApiError(error)) {
            return false;
          }
          if (isApiUnavailableError(error)) {
            return failureCount < 2;
          }
          return failureCount < 2;
        },
        staleTime: 60_000,
      },
    },
  });
}

export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
