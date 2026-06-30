import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createKeepInTouchQueryFn } from "@/lib/query/fetchers/serverQueryFns";
import { contactKeys } from "@/lib/query/keys";
import { getQueryClient } from "@/lib/query/client";
import { KeepInTouchClient } from "./KeepInTouchClient";

interface KeepInTouchLoaderProps {
  endDate: string;
}

export async function KeepInTouchLoader({ endDate }: KeepInTouchLoaderProps) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: contactKeys.keepInTouch(),
    queryFn: createKeepInTouchQueryFn(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KeepInTouchClient endDate={endDate} />
    </HydrationBoundary>
  );
}
