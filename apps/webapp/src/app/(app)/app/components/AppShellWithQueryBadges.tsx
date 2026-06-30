"use client";

import { useKeepInTouchQuery } from "@/lib/query/hooks/useKeepInTouch";
import { useHasActiveMergeRecommendationsBadge } from "@/lib/query/hooks/useMergeRecommendations";
import { useEnrichBatchInvalidation } from "@/lib/query/enrichInvalidation";
import { AppShellWrapper } from "./AppShellWrapper";

interface AppShellWithQueryBadgesProps {
  children: React.ReactNode;
  userName: string;
  avatarUrl: string | null;
  initialCollapsed: boolean;
}

function computeHasOverdueKeepInTouch(
  contacts: { keepFrequencyDays?: number | null; lastInteraction?: string | Date | null }[],
): boolean {
  return contacts.some((c) => {
    if (!c.keepFrequencyDays || !c.lastInteraction) return true;
    const nextDue = new Date(c.lastInteraction);
    nextDue.setDate(nextDue.getDate() + c.keepFrequencyDays);
    return nextDue <= new Date();
  });
}

/**
 * Client shell that loads sidebar badge indicators via TanStack Query.
 */
export function AppShellWithQueryBadges({
  children,
  userName,
  avatarUrl,
  initialCollapsed,
}: AppShellWithQueryBadgesProps) {
  useEnrichBatchInvalidation();

  const hasActiveMergeRecommendations = useHasActiveMergeRecommendationsBadge();
  const { data: keepInTouchData } = useKeepInTouchQuery();
  const hasOverdueKeepInTouch = computeHasOverdueKeepInTouch(keepInTouchData?.contacts ?? []);

  return (
    <AppShellWrapper
      userName={userName}
      avatarUrl={avatarUrl}
      initialCollapsed={initialCollapsed}
      hasActiveMergeRecommendations={hasActiveMergeRecommendations}
      hasOverdueKeepInTouch={hasOverdueKeepInTouch}
    >
      {children}
    </AppShellWrapper>
  );
}
