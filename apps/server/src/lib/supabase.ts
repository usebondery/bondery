/**
 * Supabase Client Configuration
 * Creates authenticated Supabase client from request cookies
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/database";
import type { FastifyRequest, FastifyReply } from "fastify";

/**
 * Gets Supabase configuration from environment
 * These will be validated by @fastify/env at startup
 */
function getSupabaseConfig() {
  const SUPABASE_URL_RAW = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL_RAW || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    throw new Error(
      "Missing required Supabase environment variables. " +
        "Ensure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SECRET_KEY are set.",
    );
  }

  // Normalize: Supabase client expects base url (no /rest/v1)
  const SUPABASE_URL = SUPABASE_URL_RAW.replace(/\/rest\/v1\/?$/, "");

  if (SUPABASE_URL !== SUPABASE_URL_RAW) {
    console.log("[getSupabaseConfig] Normalized SUPABASE_URL from", SUPABASE_URL_RAW, "to", SUPABASE_URL);
  }

  return { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY };
}

/**
 * Creates an anonymous Supabase client (for public endpoints)
 */
export function createAnonClient(): SupabaseClient<Database> {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseConfig();
  console.log("Creating anon client with URL:", SUPABASE_URL);
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Creates an admin Supabase client (for privileged operations)
 */
export function createAdminClient(): SupabaseClient<Database> {
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = getSupabaseConfig();
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/**
 * Extract Supabase auth tokens from request cookies
 */
/**
 * Parse cookies from Cookie header string
 */
function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=');
    }
  });
  
  return cookies;
}

/**
 * Combine chunked cookies (e.g., cookie.0, cookie.1)
 */
function combineChunkedCookies(cookies: Record<string, string>): Record<string, string> {
  const combined: Record<string, string> = {};
  const chunks: Record<string, string[]> = {};
  
  // Group cookies by base name
  for (const [key, value] of Object.entries(cookies)) {
    const match = key.match(/^(.+)\.(\d+)$/);
    if (match) {
      const baseName = match[1];
      const chunkIndex = parseInt(match[2], 10);
      if (!chunks[baseName]) {
        chunks[baseName] = [];
      }
      chunks[baseName][chunkIndex] = value;
    } else {
      combined[key] = value;
    }
  }
  
  // Combine chunks in order
  for (const [baseName, chunkArray] of Object.entries(chunks)) {
    combined[baseName] = chunkArray.filter(Boolean).join('');
  }
  
  return combined;
}

function getSupabaseProjectRef(supabaseUrl: string): string {
  try {
    const host = new URL(supabaseUrl).hostname;
    if (host.startsWith("127.0.0.1")) return "127";
    const parts = host.split(".");
    return parts[0];
  } catch {
    return "127";
  }
}

function getAuthTokensFromCookies(request: FastifyRequest): {
  accessToken?: string;
  refreshToken?: string;
} {
  const { SUPABASE_URL } = getSupabaseConfig();
  const projectRef = getSupabaseProjectRef(SUPABASE_URL);

  // First try Fastify's parsed cookies (from browser requests)
  let cookies = request.cookies || {};
  
  // If no cookies parsed, try to parse from Cookie header (from server-to-server requests)
  if (Object.keys(cookies).length === 0 && request.headers.cookie) {
    console.log("[getAuthTokensFromCookies] Manually parsing Cookie header");
    cookies = parseCookieHeader(request.headers.cookie);
  }
  
  // Combine chunked cookies
  cookies = combineChunkedCookies(cookies);
  
  console.log("[getAuthTokensFromCookies] Combined cookie keys:", Object.keys(cookies));
  console.log("[getAuthTokensFromCookies] Using projectRef:", projectRef);

  // Supabase stores tokens in cookies with project-specific names
  // Format: sb-<project-ref>-auth-token
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  for (const [key, value] of Object.entries(cookies)) {
    const isAuthCookie = key.startsWith(`sb-${projectRef}-auth-token`);
    if (!isAuthCookie) continue;

    if (value) {
      console.log(`[getAuthTokensFromCookies] Found auth cookie: ${key}`);
      console.log(`[getAuthTokensFromCookies] Cookie value (first 100 chars):`, value.substring(0, 100));

      // Supabase sets base64-prefixed JSON strings for auth cookies
      const decodedValue = value.startsWith("base64-")
        ? Buffer.from(value.slice(7), "base64").toString("utf-8")
        : value;

      try {
        // The cookie might be a JSON object with access_token and refresh_token
        const parsed = JSON.parse(decodedValue);
        console.log("[getAuthTokensFromCookies] Successfully parsed JSON, keys:", Object.keys(parsed));
        if (parsed.access_token) {
          accessToken = parsed.access_token;
          console.log("[getAuthTokensFromCookies] Found access_token in parsed JSON");
        }
        if (parsed.refresh_token) {
          refreshToken = parsed.refresh_token;
          console.log("[getAuthTokensFromCookies] Found refresh_token in parsed JSON");
        }
      } catch (e) {
        console.log("[getAuthTokensFromCookies] Failed to parse as JSON:", e.message);
        // If not JSON, might be direct token
        if (key.includes("access")) accessToken = value;
        if (key.includes("refresh")) refreshToken = value;
      }
    }
  }

  // Also check for standard Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
    console.log("[getAuthTokensFromCookies] Found Bearer token in Authorization header");
  }

  console.log("[getAuthTokensFromCookies] Result - accessToken:", !!accessToken, "refreshToken:", !!refreshToken);
  return { accessToken, refreshToken };
}

/**
 * Creates an authenticated Supabase client from request
 */
export async function createAuthenticatedClient(
  request: FastifyRequest,
): Promise<{ client: SupabaseClient<Database>; user: { id: string; email: string } | null }> {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseConfig();
  const { accessToken, refreshToken } = getAuthTokensFromCookies(request);
  console.log("Creating authenticated client. Access token present:", !!accessToken);
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (!accessToken) {
    return { client, user: null };
  }

  // Set the session with the tokens
  const { data, error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || "",
  });

  if (error || !data.user) {
    console.log("[createAuthenticatedClient] setSession error:", error?.message, error?.status);
    console.log("[createAuthenticatedClient] setSession data:", data);
    return { client, user: null };
  }

  return {
    client,
    user: {
      id: data.user.id,
      email: data.user.email || "",
    },
  };
}

/**
 * Authentication middleware result
 */
export interface AuthResult {
  user: { id: string; email: string };
  client: SupabaseClient<Database>;
}

/**
 * Verify authentication and return user + client, or send 401 response
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthResult | null> {
  console.log("Requiring authentication for request");

  const { client, user } = await createAuthenticatedClient(request);

  if (!user) {
    reply.status(401).send({ error: "Unauthorized - Please log in" });
    return null;
  }

  return { user, client };
}
