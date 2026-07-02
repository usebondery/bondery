import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ServerSessionResult =
  | { status: "ok"; user: User; accessToken: string }
  | { status: "unauthorized" };

/**
 * Single server-side session primitive for auth guards and API transport.
 *
 * Validates with Supabase (`getUser`) before returning the access token.
 * Wrapped in React cache() so it runs at most once per request.
 */
export const resolveServerSession = cache(async (): Promise<ServerSessionResult> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { status: "unauthorized" };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    return { status: "unauthorized" };
  }

  return { status: "ok", user, accessToken };
});

/** Clears Supabase auth cookies on the server (e.g. stale or deleted-user sessions). */
export async function signOutServerSession(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}
