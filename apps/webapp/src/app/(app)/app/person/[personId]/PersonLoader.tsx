import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import PersonClient from "./PersonClient";
import { prefetchPersonPageQueries } from "./prefetchPersonPageQueries";

interface PersonLoaderProps {
  initialTab?: string;
  myselfMode?: boolean;
  personId: string;
}

export async function PersonLoader({ personId, initialTab, myselfMode }: PersonLoaderProps) {
  const queryClient = getQueryClient();

  await prefetchPersonPageQueries(queryClient, personId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PersonClient initialTab={initialTab} myselfMode={myselfMode} personId={personId} />
    </HydrationBoundary>
  );
}
