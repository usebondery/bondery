"use client";

import type { UserSessionState } from "@/components/shell/UserSessionProvider";
import { applyUserSessionFromRef } from "@/components/shell/UserSessionProvider";

export type UserSessionPatch = Partial<
  Pick<UserSessionState, "avatarUrl" | "colorScheme" | "displayName">
>;

let refreshLayoutRef: (() => void) | null = null;

export function registerAppShellRefresh(refresh: () => void): () => void {
  refreshLayoutRef = refresh;
  return () => {
    if (refreshLayoutRef === refresh) {
      refreshLayoutRef = null;
    }
  };
}

/** Re-run layout session probe and optionally patch client shell identity immediately. */
export function refreshAppShell(sessionPatch?: UserSessionPatch): void {
  if (sessionPatch) {
    applyUserSessionFromRef(sessionPatch);
  }
  refreshLayoutRef?.();
}
