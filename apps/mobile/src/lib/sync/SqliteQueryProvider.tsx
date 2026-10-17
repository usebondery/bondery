import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { getSqliteQueryClient, subscribeSqliteQueryClient } from "./sqlite-query-client";

type SqliteQueryProviderProps = {
  children: ReactNode;
};

export function SqliteQueryProvider({ children }: SqliteQueryProviderProps) {
  const client = useSyncExternalStore(
    subscribeSqliteQueryClient,
    getSqliteQueryClient,
    getSqliteQueryClient,
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
