"use client";

import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { captureEvent, posthog } from "@/lib/analytics/client";
import { createWebappAuthClient } from "@/lib/auth/client";
import { buildLoginUrl, getClientReturnPathForLogin } from "@/lib/auth/returnIntent";
import { resetState } from "@/lib/extension/enrichBatchStore";
import { statusNotificationsStore } from "@/lib/extension/statusNotificationsStore";

export type EndSessionReason = "user_initiated" | "session_expired" | "account_deleted";

export type EndSessionOptions = {
  reason: EndSessionReason;
  redirectTo?: string;
};

let isEndingSession = false;

function clearEndingSession(): void {
  isEndingSession = false;
}

function resolveRedirectTo(reason: EndSessionReason, redirectTo?: string): string {
  if (redirectTo !== undefined) {
    return redirectTo;
  }

  if (reason === "session_expired") {
    return buildLoginUrl(getClientReturnPathForLogin());
  }

  return WEBSITE_ROUTES.LOGIN;
}

/**
 * Ends the authenticated client session: cancels and clears caches, resets
 * module stores, dismisses UI chrome, signs out of Better Auth + the webapp
 * BFF session, and hard-navigates to login. Idempotent — safe to call more than once.
 */
export async function endSession({ reason, redirectTo }: EndSessionOptions): Promise<void> {
  if (typeof window === "undefined" || isEndingSession) {
    return;
  }

  isEndingSession = true;
  const destination = resolveRedirectTo(reason, redirectTo);

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
      sessionStorage.removeItem("bondery:auth:session_create_fired");
    } catch {
      // Continue teardown if session storage cleanup fails.
    }

    try {
      captureEvent("auth:session_end");
      posthog.reset();
    } catch {
      // Continue teardown if analytics cleanup fails.
    }

    try {
      await fetch("/api/session/logout", { method: "POST" });
    } catch {
      // Continue teardown if BFF cookie clear fails.
    }

    try {
      const authClient = createWebappAuthClient();
      if (reason === "user_initiated") {
        await authClient.signOut();
      }
      // Cookie is meant to survive logout so login can show "Last used".
      // Account deletion is the teardown that should expire it.
      if (reason === "account_deleted") {
        authClient.clearLastUsedLoginMethod();
      }
    } catch {
      // Continue teardown if Better Auth client cleanup fails.
    }

    window.location.replace(destination);
  } finally {
    clearEndingSession();
  }
}
