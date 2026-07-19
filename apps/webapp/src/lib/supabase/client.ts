import type { WebappRuntimeConfig } from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import { createBrowserClient } from "@supabase/ssr";
import { getWebappRuntimeConfigSync } from "@/lib/platform/runtimeConfig.client";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookieOptions";

export function createBrowswerSupabaseClient(config?: WebappRuntimeConfig) {
  const cfg = config ?? getWebappRuntimeConfigSync();
  return createBrowserClient<Database>(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
  });
}
