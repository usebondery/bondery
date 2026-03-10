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
import type { SupabaseClient } from "@supabase/supabase-js";
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
    /** Validates x-reminder-job-secret header for server-to-server calls */
    verifyServiceSecret: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
  // Validates x-reminder-job-secret header for server-to-server calls
  // (e.g. reminder cron job).
  fastify.decorate(
    "verifyServiceSecret",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const secret = request.headers["x-reminder-job-secret"];
      if (
        typeof secret !== "string" ||
        secret !== fastify.config.PRIVATE_BONDERY_SUPABASE_HTTP_KEY
      ) {
        const err = new Error("Unauthorized") as Error & { statusCode: number };
        err.statusCode = 401;
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
