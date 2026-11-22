"use client";

import type { UserSessionState } from "@/components/shell/UserSessionProvider";
import { applyUserSessionFromRef } from "@/components/shell/UserSessionProvider";

let refreshLayoutRef: (() => void) | null = null;

export type UserSessionPatch = Partial<
  Pick<UserSessionState, "avatarUrl" | "colorScheme" | "displayName">
>;

export function registerAppShellRefresh(refresh: () => void): () => void {
  refreshLayoutRef = refresh;
  return () => {
    if (refreshLayoutRef === refresh) {
      refreshLayoutRef = null;
    }
  };
}

/** Re-run layout session probe for route gates (onboarding) or last-resort identity. Preference field saves should patch providers instead. */
export function refreshAppShell(sessionPatch?: UserSessionPatch): void {
  if (sessionPatch) {
    applyUserSessionFromRef(sessionPatch);
  }
  refreshLayoutRef?.();
}
