import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Builds Authorization headers for server → Fastify API calls.
 *
 * Validates the session with Supabase (`getUser`) before attaching the
 * access token. Wrapped in React cache() so it runs at most once per request.
 */
export const getAuthHeaders = cache(async (): Promise<HeadersInit> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {};
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return {};
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
});
