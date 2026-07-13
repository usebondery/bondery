import type { ColorSchemePreference } from "@bondery/schemas";
import { cache } from "react";
import { getAppSession } from "@/lib/app/getAppSession";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * SSR color scheme for root layout (ColorSchemeScript + html attribute).
 * Reuses cache()-wrapped getAppSession() — no extra API call when app layout renders.
 */
export const resolveSsrColorScheme = cache(async (): Promise<ColorSchemePreference> => {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return "auto";
    }

    const appSession = await getAppSession();
    if (appSession.status !== "ok") {
      return "auto";
    }

    return appSession.session.colorScheme;
  } catch {
    return "auto";
  }
});
