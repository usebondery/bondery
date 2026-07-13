import type { CookieOptions } from "@supabase/ssr";

/** Shared Supabase auth cookie defaults for SSR clients. */
export function getSupabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
