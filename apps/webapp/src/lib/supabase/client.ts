import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@bondery/types/supabase.types";

export function createBrowswerSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
