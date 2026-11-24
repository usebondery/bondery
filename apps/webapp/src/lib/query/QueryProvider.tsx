"use client";

import { QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";
import { getQueryClient } from "./client";
import { useEnrichBatchInvalidation } from "./enrichInvalidation";

function QueryProviderInner({ children }: { children: ReactNode }) {
  useEnrichBatchInvalidation();
  return <>{children}</>;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        <QueryProviderInner>{children}</QueryProviderInner>
      </QueryErrorResetBoundary>
      {process.env["NODE_ENV"] === "development" ? (
        <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
