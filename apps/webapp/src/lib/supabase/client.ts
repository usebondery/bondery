import type { Database } from "@bondery/schemas/supabase.types";
import { createBrowserClient } from "@supabase/ssr";
import { getWebappRuntimeConfigSync } from "@/lib/platform/runtimeConfig.client";

export function createBrowswerSupabaseClient() {
  const cfg = getWebappRuntimeConfigSync();
  return createBrowserClient<Database>(cfg.supabaseUrl, cfg.supabasePublishableKey);
}
