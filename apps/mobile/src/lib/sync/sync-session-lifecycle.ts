export type SyncSessionLifecycleAction = "idle" | "start" | "wipe_logout" | "wipe_user_switch";

export function decideSyncSessionLifecycle(input: {
  hasLocalToken: boolean;
  isAuthenticated: boolean;
  isSessionHydrating: boolean;
  nextUserId: string | null;
  previousUserId: string | null;
}): SyncSessionLifecycleAction {
  if (input.isSessionHydrating) {
    return "idle";
  }

  if (!input.isAuthenticated || !input.nextUserId) {
    if (input.previousUserId) {
      return "wipe_logout";
    }
    return "idle";
  }

  if (!input.hasLocalToken) {
    return "idle";
  }

  if (input.previousUserId && input.previousUserId !== input.nextUserId) {
    return "wipe_user_switch";
  }

  return "start";
}
