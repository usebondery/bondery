import { createClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/supabase.types";
import { HAS_MOBILE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { supabaseSecureStorage } from "./secureStorage";

export const supabase = HAS_MOBILE_CONFIG
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        // PKCE: Supabase redirects with ?code= query param instead of hash
        // tokens, so the code can be exchanged manually in the callback screen.
        flowType: "pkce",
        // Do not auto-detect session from URL — the callback screen handles it.
        detectSessionInUrl: false,
        storage: supabaseSecureStorage,
      },
    })
  : null;
