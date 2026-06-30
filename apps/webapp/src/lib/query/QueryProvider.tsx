"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
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
      <QueryProviderInner>{children}</QueryProviderInner>
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}
