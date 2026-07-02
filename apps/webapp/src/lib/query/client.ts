import { QueryClient, environmentManager } from "@tanstack/react-query";
import { isApiUnavailableError } from "@/lib/api/availability";
import { isUnauthorizedApiError } from "@/lib/auth/unauthorized";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (isUnauthorizedApiError(error) || isApiUnavailableError(error)) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
