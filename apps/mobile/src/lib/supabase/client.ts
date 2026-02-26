import { createClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/supabase.types";
import { HAS_MOBILE_CONFIG, SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { supabaseSecureStorage } from "./secureStorage";

export const supabase = HAS_MOBILE_CONFIG
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: supabaseSecureStorage,
      },
    })
  : null;
