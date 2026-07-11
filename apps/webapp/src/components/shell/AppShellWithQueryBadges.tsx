"use client";

import { useUserSession } from "@/components/shell/UserSessionProvider";
import { useContactsAttentionBadge } from "@/lib/query/hooks/useContactsAttentionBadge";
import { useKeepInTouchCountQuery } from "@/lib/query/hooks/useKeepInTouch";
import { AppShellWrapper } from "./AppShellWrapper";

interface AppShellWithQueryBadgesProps {
  children: React.ReactNode;
  initialCollapsed: boolean;
}

/**
 * Client shell that loads sidebar badge indicators via TanStack Query.
 */
export function AppShellWithQueryBadges({
  children,
  initialCollapsed,
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
      initialCollapsed={initialCollapsed}
      userName={displayName}
    >
      {children}
    </AppShellWrapper>
  );
}
