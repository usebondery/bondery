import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";
import { prefetchKeepInTouch } from "@/lib/query/prefetch";
import { KeepInTouchClient } from "./KeepInTouchClient";

interface KeepInTouchLoaderProps {
  endDate: string;
}

export async function KeepInTouchLoader({ endDate }: KeepInTouchLoaderProps) {
  const queryClient = getQueryClient();

  await prefetchKeepInTouch(queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <KeepInTouchClient endDate={endDate} />
    </HydrationBoundary>
  );
}
