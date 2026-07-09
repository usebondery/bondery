import type { Database } from "@bondery/schemas/supabase.types";
import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from "@/lib/platform/config";

export function createBrowswerSupabaseClient() {
  return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
