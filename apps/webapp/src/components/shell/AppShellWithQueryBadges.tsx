"use client";

import { useUserSession } from "@/components/shell/UserSessionProvider";
import { useContactsAttentionBadge } from "@/lib/query/hooks/useContactsAttentionBadge";
import { useKeepInTouchCountQuery } from "@/lib/query/hooks/useKeepInTouch";
import { AppShellWrapper } from "./AppShellWrapper";

interface AppShellWithQueryBadgesProps {
  children: React.ReactNode;
  initialLastExpandedWidth: number;
  initialWidth: number;
}

/**
 * Client shell that loads sidebar badge indicators via TanStack Query.
 */
export function AppShellWithQueryBadges({
  children,
  initialLastExpandedWidth,
  initialWidth,
}: AppShellWithQueryBadgesProps) {
  const { displayName, avatarUrl } = useUserSession();
  const hasActiveMergeRecommendations = useContactsAttentionBadge();
  const { data: overdueCount = 0 } = useKeepInTouchCountQuery();
  const hasOverdueKeepInTouch = overdueCount > 0;

  return (
    <AppShellWrapper
      avatarUrl={avatarUrl}
      hasActiveMergeRecommendations={hasActiveMergeRecommendations}
      hasOverdueKeepInTouch={hasOverdueKeepInTouch}
      initialLastExpandedWidth={initialLastExpandedWidth}
      initialWidth={initialWidth}
      userName={displayName}
    >
      {children}
    </AppShellWrapper>
  );
}
