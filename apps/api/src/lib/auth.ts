/**
 * Authentication strategies for @fastify/auth
 *
 * Provides composable auth strategies that run as onRequest hooks,
 * rejecting unauthorized requests before the body is parsed.
 *
 * Usage in route modules:
 *   fastify.addHook('onRequest', fastify.auth([fastify.verifySession]));
 *
 * Then in handlers:
 *   const { client, user } = getAuth(request);
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/supabase.types";
import { createAuthenticatedClient } from "./supabase.js";

// ── Type augmentation ────────────────────────────────────────────────────────

declare module "fastify" {
  interface FastifyRequest {
    /** Authenticated user — set by verifySession strategy */
    authUser: { id: string; email: string } | null;
    /** RLS-scoped Supabase client — set by verifySession strategy */
    authClient: SupabaseClient<Database> | null;
  }

  interface FastifyInstance {
    /** Validates Supabase session from cookies / Authorization header */
    verifySession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Validates service role key via Authorization: Bearer header for server-to-server calls */
    verifyServiceSecret: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Validates session + checks is_admin flag on user_settings */
    verifyAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// ── Strategy registration ────────────────────────────────────────────────────

/**
 * Registers auth strategy decorators on the Fastify instance.
 * Must be called after @fastify/env (needs config) and before route registration.
 */
export function registerAuthStrategies(fastify: FastifyInstance): void {
  // Decorate requests with auth slots (null = not yet authenticated)
  fastify.decorateRequest("authUser", null);
  fastify.decorateRequest("authClient", null);

  // ── verifySession ────────────────────────────────────────────────────────
  // Extracts Supabase session from cookies / Bearer token.
  // On success: populates request.authUser and request.authClient.
  // On failure: throws 401.
  fastify.decorate(
    "verifySession",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const { client, user } = await createAuthenticatedClient(request);
      if (!user) {
        const err = new Error("Unauthorized - Please log in") as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }
      request.authUser = user;
      request.authClient = client;
    },
  );

  // ── verifyServiceSecret ──────────────────────────────────────────────────
  // Verifies the caller sent the Supabase service role key as a Bearer token
  // by attempting an admin API call to GoTrue. If the token is a valid service
  // role key, the call succeeds. Verified tokens are cached for the process
  // lifetime to avoid repeated round-trips.
  const verifiedServiceTokens = new Set<string>();

  fastify.decorate(
    "verifyServiceSecret",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const authHeader = request.headers.authorization;
      if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        request.log.warn(
          { url: request.url, reason: "missing or malformed Authorization header" },
          "verifyServiceSecret: rejected",
        );
        const err = new Error("Unauthorized") as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }

      const token = authHeader.slice(7);
      if (verifiedServiceTokens.has(token)) return;

      const client = createClient(fastify.config.NEXT_PUBLIC_SUPABASE_URL, token, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        request.log.warn(
          {
            url: request.url,
            reason: "GoTrue admin call rejected token",
            supabaseError: error.message,
          },
          "verifyServiceSecret: rejected",
        );
        const err = new Error("Unauthorized") as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }

      verifiedServiceTokens.add(token);
    },
  );

  // ── verifyAdmin ────────────────────────────────────────────────────────────
  // Verifies the user has an active session AND the is_admin flag is set
  // on their user_settings row. Rejects with 403 if not an admin.
  fastify.decorate(
    "verifyAdmin",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // First verify the session (populates authUser + authClient)
      const { client, user } = await createAuthenticatedClient(request);
      if (!user) {
        const err = new Error("Unauthorized - Please log in") as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }
      request.authUser = user;
      request.authClient = client;

      // Check admin flag
      const { data, error } = await client
        .from("user_settings")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (error || !data?.is_admin) {
        const err = new Error("Forbidden - Admin access required") as Error & { statusCode: number };
        err.statusCode = 403;
        throw err;
      }
    },
  );
}

// ── Helper for handlers ──────────────────────────────────────────────────────

/**
 * Retrieve the authenticated user and Supabase client from the request.
 * Only call this inside handlers protected by verifySession.
 */
export function getAuth(request: FastifyRequest): {
  user: { id: string; email: string };
  client: SupabaseClient<Database>;
} {
  return {
    user: request.authUser!,
    client: request.authClient!,
  };
}
