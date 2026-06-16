import { cache } from "react";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Creates headers object with authentication cookies for internal API calls.
 * Wrapped in React cache() so it runs at most once per server render,
 * even when called from multiple layouts or utilities in the same request.
 */
export const getAuthHeaders = cache(async (): Promise<HeadersInit> => {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const headers: HeadersInit = {};

  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  // Attach Supabase access token so API can authorize cross-domain requests
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
});
