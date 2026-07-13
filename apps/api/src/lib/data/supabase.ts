/**
 * Supabase Client Configuration
 * Creates authenticated Supabase client from request cookies
 */

import type { AvatarTransformOptions } from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { FastifyRequest } from "fastify";
import logger from "../platform/logger.js";

/**
 * Gets Supabase configuration from environment
 * These will be validated by @fastify/env at startup
 */
function getSupabaseConfig() {
  const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const PRIVATE_SUPABASE_SECRET_KEY = process.env.PRIVATE_SUPABASE_SECRET_KEY;

  if (!NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      "Missing required Supabase environment variables. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, and PRIVATE_SUPABASE_SECRET_KEY are set.",
    );
  } else if (!PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.");
  } else if (!PRIVATE_SUPABASE_SECRET_KEY) {
    throw new Error("Missing PRIVATE_SUPABASE_SECRET_KEY environment variable.");
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL,
    PRIVATE_SUPABASE_SECRET_KEY,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

/**
 * Creates an anonymous Supabase client (for public endpoints)
 */
export function createAnonClient(): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Creates an admin Supabase client (for privileged operations)
 */
export function createAdminClient(): SupabaseClient<Database> {
  const { NEXT_PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SECRET_KEY } = getSupabaseConfig();
  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, PRIVATE_SUPABASE_SECRET_KEY);
}

/**
 * Extract Supabase auth tokens from request cookies
 */
/**
 * Parse cookies from Cookie header string
 */
function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name && rest.length > 0) {
      cookies[name] = rest.join("=");
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
    combined[baseName] = chunkArray.filter(Boolean).join("");
  }

  return combined;
}

function getSupabaseProjectRef(supabaseUrl: string): string {
  try {
    const host = new URL(supabaseUrl).hostname;
    if (host.startsWith("127.0.0.1")) {
      return "127";
    }
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
  const { NEXT_PUBLIC_SUPABASE_URL } = getSupabaseConfig();
  const projectRef = getSupabaseProjectRef(NEXT_PUBLIC_SUPABASE_URL);

  // First try Fastify's parsed cookies (from browser requests)
  let cookies = request.cookies || {};

  // If no cookies parsed, try to parse from Cookie header (from server-to-server requests)
  if (Object.keys(cookies).length === 0 && request.headers.cookie) {
    cookies = parseCookieHeader(request.headers.cookie);
  }

  // Combine chunked cookies - filter out undefined values
  const filteredCookies: Record<string, string> = {};
  for (const [key, value] of Object.entries(cookies)) {
    if (value !== undefined) {
      filteredCookies[key] = value;
    }
  }
  cookies = combineChunkedCookies(filteredCookies);

  // Supabase stores tokens in cookies with project-specific names
  // Format: sb-<project-ref>-auth-token
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  for (const [key, value] of Object.entries(cookies)) {
    const isAuthCookie = key.startsWith(`sb-${projectRef}-auth-token`);
    if (!isAuthCookie) {
      continue;
    }

    if (value) {
      // Supabase sets base64-prefixed JSON strings for auth cookies
      const decodedValue = value.startsWith("base64-")
        ? Buffer.from(value.slice(7), "base64").toString("utf-8")
        : value;

      try {
        // The cookie might be a JSON object with access_token and refresh_token
        const parsed = JSON.parse(decodedValue);
        if (parsed.access_token) {
          accessToken = parsed.access_token;
        }
        if (parsed.refresh_token) {
          refreshToken = parsed.refresh_token;
        }
      } catch (e) {
        logger.debug(
          { err: e instanceof Error ? e.message : String(e) },
          "[getAuthTokensFromCookies] Failed to parse as JSON",
        );
        // If not JSON, might be direct token
        if (key.includes("access")) {
          accessToken = value;
        }
        if (key.includes("refresh")) {
          refreshToken = value;
        }
      }
    }
  }

  // Also check for standard Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    accessToken = authHeader.substring(7);
  }

  return { accessToken, refreshToken };
}

/**
 * Creates an authenticated Supabase client from request
 */
export async function createAuthenticatedClient(
  request: FastifyRequest,
  accessTokenOverride?: string,
): Promise<{
  client: SupabaseClient<Database>;
  user: { id: string; email: string } | null;
  authError?: string;
}> {
  const { NEXT_PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();
  const { accessToken: cookieToken } = getAuthTokensFromCookies(request);
  const accessToken = accessTokenOverride ?? cookieToken;

  // Build a client that forwards the Bearer token on every request (for RLS).
  // Using getUser() to validate because the token may be either a Supabase session
  // JWT (cookie-based webapp flow) or a Supabase OAuth 2.1 access token (extension
  // PKCE flow). Both are valid Supabase JWTs but the OAuth refresh token is NOT
  // interchangeable with Supabase's internal session refresh token, so setSession()
  // would fail for the extension flow.
  const client = createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  if (!accessToken) {
    return { client, user: null };
  }

  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    logger.warn(
      { errorMessage: error?.message, errorStatus: error?.status },
      "[createAuthenticatedClient] getUser error",
    );
    return { authError: error?.message, client, user: null };
  }

  return {
    client,
    user: {
      email: data.user.email || "",
      id: data.user.id,
    },
  };
}

/**
 * Constructs the public storage URL for a contact's avatar.
 * Avatars are stored in the `avatars` bucket under the path `{userId}/{personId}.jpg`.
 *
 * When `options` is provided, Supabase Storage image transformations are applied
 * to resize and/or adjust the quality of the returned image.
 *
 * @param client - Authenticated Supabase client
 * @param userId - The ID of the owning user
 * @param personId - The ID of the contact (person)
 * @param options - Optional avatar transform options (quality + size presets)
 * @returns The public avatar URL, or null if unavailable
 */

const AVATAR_SIZE_MAP = { large: 256, medium: 128, small: 64 } as const;
const AVATAR_QUALITY_MAP = { high: 90, low: 40, medium: 70 } as const;

export function buildContactAvatarUrl(
  client: SupabaseClient<Database>,
  userId: string,
  personId: string,
  options?: AvatarTransformOptions,
  updatedAt?: string | null,
): string | null {
  const path = `${userId}/${personId}.jpg`;

  const transform: Record<string, number> = {};
  if (options?.size) {
    const px = AVATAR_SIZE_MAP[options.size];
    transform.width = px;
    transform.height = px;
  }
  if (options?.quality) {
    transform.quality = AVATAR_QUALITY_MAP[options.quality];
  }

  const hasTransform = Object.keys(transform).length > 0;

  const { data } = client.storage
    .from("avatars")
    .getPublicUrl(path, hasTransform ? { transform } : undefined);

  const baseUrl = data?.publicUrl ?? null;
  if (!baseUrl) {
    return null;
  }

  if (updatedAt) {
    const ts = new Date(updatedAt).getTime();
    if (!Number.isNaN(ts)) {
      const sep = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${sep}t=${ts}`;
    }
  }

  return baseUrl;
}

export type ContactAvatarSource = {
  id: string;
  hasAvatar: boolean;
  updatedAt?: string | null;
};

/**
 * Returns the public avatar URL when the contact has a stored photo, otherwise null.
 */
export function resolveContactAvatarUrl(
  client: SupabaseClient<Database>,
  userId: string,
  contact: ContactAvatarSource,
  options?: AvatarTransformOptions,
): string | null {
  if (!contact.hasAvatar) {
    return null;
  }

  return buildContactAvatarUrl(client, userId, contact.id, options, contact.updatedAt);
}
