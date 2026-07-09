"use client";

import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { resetState } from "@/lib/extension/enrichBatchStore";
import { statusNotificationsStore } from "@/lib/extension/statusNotificationsStore";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";

export type EndSessionReason = "user_initiated" | "session_expired" | "account_deleted";

export type EndSessionOptions = {
  reason: EndSessionReason;
  redirectTo?: string;
};

let isEndingSession = false;

function resolveSignOutScope(reason: EndSessionReason): "local" | undefined {
  return reason === "user_initiated" ? undefined : "local";
}

/**
 * Ends the authenticated client session: cancels and clears caches, resets
 * module stores, dismisses UI chrome, signs out of Supabase, and hard-navigates
 * to login. Idempotent — safe to call more than once.
 */
export async function endSession({
  reason,
  redirectTo = WEBSITE_ROUTES.LOGIN,
}: EndSessionOptions): Promise<void> {
  if (typeof window === "undefined" || isEndingSession) {
    return;
  }

  isEndingSession = true;

  try {
    try {
      const { getQueryClient } = await import("@/lib/query/client");
      const queryClient = getQueryClient();
      await queryClient.cancelQueries();
      queryClient.clear();
    } catch {
      // Continue teardown if query cache cleanup fails.
    }

    try {
      resetState();
    } catch {
      // Continue teardown if enrich store reset fails.
    }

    try {
      notifications.clean();
      notifications.clean(statusNotificationsStore);
    } catch {
      // Continue teardown if notification cleanup fails.
    }

    try {
      modals.closeAll();
    } catch {
      // Continue teardown if modal cleanup fails.
    }

    try {
      const supabase = createBrowswerSupabaseClient();
      const scope = resolveSignOutScope(reason);
      if (scope) {
        await supabase.auth.signOut({ scope });
      } else {
        await supabase.auth.signOut();
      }
    } catch {
      // Still redirect if sign-out fails.
    }

    window.location.replace(redirectTo);
  } finally {
    isEndingSession = false;
  }
}
