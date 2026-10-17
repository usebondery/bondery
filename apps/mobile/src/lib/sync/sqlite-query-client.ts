import { QueryClient } from "@tanstack/react-query";
import { sqliteQueryKeys } from "./sqlite-query-keys";

const SQLITE_QUERY_GC_TIME_MS = 5 * 60 * 1000;

type QueryClientListener = (client: QueryClient) => void;

function createSqliteQueryClient(): QueryClient {
  const client = new QueryClient();
  client.setQueryDefaults(sqliteQueryKeys.root, {
    gcTime: SQLITE_QUERY_GC_TIME_MS,
    networkMode: "always",
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return client;
}

const listeners = new Set<QueryClientListener>();
let activeClient = createSqliteQueryClient();

export function getSqliteQueryClient(): QueryClient {
  return activeClient;
}

export function replaceSqliteQueryClient(): QueryClient {
  activeClient = createSqliteQueryClient();
  for (const listener of listeners) {
    listener(activeClient);
  }
  return activeClient;
}

export function subscribeSqliteQueryClient(listener: QueryClientListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
