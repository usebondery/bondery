"use client";

import { useKeepInTouchQuery } from "@/lib/query/hooks/useKeepInTouch";
import { useHasActiveMergeRecommendationsBadge } from "@/lib/query/hooks/useMergeRecommendations";
import { AppShellWrapper } from "./AppShellWrapper";

interface AppShellWithQueryBadgesProps {
  avatarUrl: string | null;
  children: React.ReactNode;
  initialCollapsed: boolean;
  userName: string;
}

function computeHasOverdueKeepInTouch(
  contacts: { keepFrequencyDays?: number | null; lastInteraction?: string | Date | null }[],
): boolean {
  return contacts.some((c) => {
    if (!c.keepFrequencyDays || !c.lastInteraction) {
      return true;
    }
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
  const hasActiveMergeRecommendations = useHasActiveMergeRecommendationsBadge();
  const { data: keepInTouchData } = useKeepInTouchQuery();
  const hasOverdueKeepInTouch = computeHasOverdueKeepInTouch(keepInTouchData?.contacts ?? []);

  return (
    <AppShellWrapper
      avatarUrl={avatarUrl}
      hasActiveMergeRecommendations={hasActiveMergeRecommendations}
      hasOverdueKeepInTouch={hasOverdueKeepInTouch}
      initialCollapsed={initialCollapsed}
      userName={userName}
    >
      {children}
    </AppShellWrapper>
  );
}
