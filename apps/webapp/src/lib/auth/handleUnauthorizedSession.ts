"use client";

import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";

export { isUnauthorizedApiError, isUnauthorizedResponseStatus } from "@/lib/auth/unauthorized";

let isHandlingUnauthorized = false;

/**
 * Clears client caches, ends the local Supabase session, and redirects to login.
 * Call when the API reports an expired or invalid session (401 / BFF_UNAUTHORIZED).
 */
export async function handleUnauthorizedSession(): Promise<void> {
  if (typeof window === "undefined" || isHandlingUnauthorized) {
    return;
  }

  isHandlingUnauthorized = true;

  try {
    const { getQueryClient } = await import("@/lib/query/client");
    getQueryClient().clear();

    try {
      const supabase = createBrowswerSupabaseClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Still redirect if sign-out fails.
    }

    window.location.replace(WEBSITE_ROUTES.LOGIN);
  } finally {
    isHandlingUnauthorized = false;
  }
}
