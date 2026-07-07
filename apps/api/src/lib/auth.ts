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
import type { AppFastifyInstance } from "./fastify-types.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import type { ApiKeyPermission } from "@bondery/schemas";
import { createAuthenticatedClient, createAdminClient } from "./supabase.js";
import {
  isApiKeyBearerToken,
  loadJwtSigningMaterial,
  mintSupabaseUserAccessToken,
  supabaseAuthIssuerUrl,
  validateApiKey,
  verifyJwtSigningJwkAgainstJwks,
} from "./api-keys.js";
import { assertApiKeyAccess } from "./api-key-access.js";

// ── Type augmentation ────────────────────────────────────────────────────────

declare module "fastify" {
  interface FastifyRequest {
    /** Authenticated user — set by verifySession / verifyAuth strategies */
    authUser: { id: string; email: string } | null;
    /** RLS-scoped Supabase client — set by verifySession / verifyAuth strategies */
    authClient: SupabaseClient<Database> | null;
    /** Set when the request was authenticated via a long-lived API key */
    authApiKey: {
      id: string;
      permission: ApiKeyPermission;
      label: string;
    } | null;
  }

  interface FastifyInstance {
    /** Validates Supabase session from cookies / Authorization header */
    verifySession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Validates session or long-lived API key */
    verifyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Enforces API key route allowlist and permission for key-authenticated requests */
    assertApiKeyAccess: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
export function registerAuthStrategies(fastify: AppFastifyInstance): void {
  // Decorate requests with auth slots (null = not yet authenticated)
  fastify.decorateRequest("authUser", null);
  fastify.decorateRequest("authClient", null);
  fastify.decorateRequest("authApiKey", null);

  const pepper = fastify.config.PRIVATE_API_KEY_PEPPER.trim();
  const jwtSigningJwk = fastify.config.PRIVATE_SUPABASE_JWT_SIGNING_JWK.trim();
  const jwtIssuerUrl = supabaseAuthIssuerUrl(fastify.config.NEXT_PUBLIC_SUPABASE_URL);

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
      request.authApiKey = null;
    },
  );

  // ── verifyAuth ─────────────────────────────────────────────────────────────
  fastify.decorate(
    "verifyAuth",
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const authHeader = request.headers.authorization;
      const bearerToken =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
          ? authHeader.slice(7)
          : undefined;

      if (bearerToken && isApiKeyBearerToken(bearerToken)) {
        const admin = createAdminClient();
        const validated = await validateApiKey(admin, bearerToken.trim(), pepper);
        if (!validated) {
          const err = new Error("Invalid API key") as Error & { statusCode: number };
          err.statusCode = 401;
          throw err;
        }

        let accessToken: string;
        try {
          accessToken = await mintSupabaseUserAccessToken(
            validated.userId,
            jwtSigningJwk,
            jwtIssuerUrl,
          );
        } catch (error) {
          request.log.error({ err: error }, "API key JWT mint failed");
          const err = new Error(
            "API key is valid but the server could not mint a session. Check PRIVATE_SUPABASE_JWT_SIGNING_JWK.",
          ) as Error & { statusCode: number };
          err.statusCode = 500;
          throw err;
        }

        const { client, user, authError } = await createAuthenticatedClient(
          request,
          accessToken,
        );
        if (!user) {
          const jwksCheck = await verifyJwtSigningJwkAgainstJwks(
            jwtSigningJwk,
            jwtIssuerUrl,
          );
          request.log.warn(
            {
              authError,
              jwtIssuerUrl,
              envKid: jwksCheck.envKid,
              jwksKids: jwksCheck.jwksKids,
              jwkKidInJwks: jwksCheck.ok,
            },
            "API key hash valid but minted JWT was rejected by Supabase Auth",
          );
          const err = new Error(
            jwksCheck.ok
              ? `API key is valid but Supabase rejected the minted session (${authError ?? "unknown error"}).`
              : (jwksCheck.message ??
                  "API key is valid but JWT signing is misconfigured."),
          ) as Error & { statusCode: number };
          err.statusCode = jwksCheck.ok ? 503 : 500;
          throw err;
        }

        request.authUser = user;
        request.authClient = client;

        request.authApiKey = {
          id: validated.id,
          permission: validated.permission,
          label: validated.label,
        };
        return;
      }

      const { client, user } = await createAuthenticatedClient(request);
      if (!user) {
        const err = new Error("Unauthorized - Please log in") as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }
      request.authUser = user;
      request.authClient = client;
      request.authApiKey = null;
    },
  );

  fastify.decorate(
    "assertApiKeyAccess",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      assertApiKeyAccess(request, reply);
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
      if (isApiKeyBearerToken(token)) {
        request.log.warn(
          { url: request.url, reason: "API key sent to service-secret route" },
          "verifyServiceSecret: rejected",
        );
        const err = new Error("Unauthorized") as Error & { statusCode: number };
        err.statusCode = 401;
        throw err;
      }
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
      request.authApiKey = null;

      // Check admin flag
      const { data, error } = await client
        .from("user_settings")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();

      if (error || !data?.is_admin) {
        const err = new Error("Forbidden - Admin access required") as Error & {
          statusCode: number;
        };
        err.statusCode = 403;
        throw err;
      }
    },
  );
}

/**
 * Loads JWT signing material and verifies the env JWK against Supabase JWKS.
 * Called from buildServer onReady only — not during OpenAPI generation.
 */
export async function verifyAuthAtStartup(fastify: AppFastifyInstance): Promise<void> {
  const jwtSigningJwk = fastify.config.PRIVATE_SUPABASE_JWT_SIGNING_JWK.trim();
  const jwtIssuerUrl = supabaseAuthIssuerUrl(fastify.config.NEXT_PUBLIC_SUPABASE_URL);

  await loadJwtSigningMaterial(jwtSigningJwk);

  const jwksCheck = await verifyJwtSigningJwkAgainstJwks(
    jwtSigningJwk,
    jwtIssuerUrl,
  );
  if (!jwksCheck.ok) {
    fastify.log.error(
      {
        envKid: jwksCheck.envKid,
        jwksKids: jwksCheck.jwksKids,
        jwksFetchError: jwksCheck.jwksFetchError,
      },
      jwksCheck.message ?? "JWT signing JWK does not match Supabase JWKS",
    );
    throw new Error(
      jwksCheck.message ??
        "PRIVATE_SUPABASE_JWT_SIGNING_JWK does not match Supabase JWKS",
    );
  }
  fastify.log.info(
    { envKid: jwksCheck.envKid, jwksKids: jwksCheck.jwksKids },
    "JWT signing JWK matches Supabase JWKS",
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
