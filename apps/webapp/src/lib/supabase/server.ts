import type { Database } from "@bondery/schemas/supabase.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookieOptions";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const cfg = buildWebappRuntimeConfigFromEnv();

  return createServerClient<Database>(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
