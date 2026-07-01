/**
 * API key management routes (session-only).
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { API_KEY_LIMITS } from "@bondery/schemas";
import {
  apiKeyCreatedSchema,
  apiKeyListItemSchema,
  apiKeysListResponseSchema,
  createApiKeyInputSchema,
  updateApiKeyLabelInputSchema,
} from "@bondery/schemas";
import { uuidParamSchema, noContentResponse, standardErrorResponses, conflictResponse } from "@bondery/schemas/http";
import { getAuth } from "../../../lib/auth.js";
import { applyOpenApiRouteMeta } from "../../../lib/openapi-route-meta.js";
import {
  withCreatedResponse,
  withOkResponse,
} from "../../../lib/openapi-route-responses.js";
import {
  formatApiKeyPrefix,
  generateApiKeyMaterial,
  hashApiKey,
} from "../../../lib/api-keys.js";

function mapApiKeyRow(row: {
  id: string;
  label: string;
  permission: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string | null;
}) {
  return {
    id: row.id,
    label: row.label,
    permission: row.permission === "read" ? ("read" as const) : ("full" as const),
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export const meApiKeysRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "session" });
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  const pepper = fastify.config.PRIVATE_API_KEY_PEPPER.trim();

  fastify.get(
    "/",
    {
      schema: {
        description: "List API keys for the authenticated user.",
        response: withOkResponse(apiKeysListResponseSchema, "API key list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
    const { client, user } = getAuth(request);

    const { data, error } = await client
      .from("api_keys")
      .select("id, label, permission, key_prefix, last_used_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      request.log.error({ err: error }, "Failed to list API keys");
      return reply.status(500).send({ error: error.message });
    }

    const apiKeys = (data ?? []).map(mapApiKeyRow);

    return {
      apiKeys,
      totalCount: apiKeys.length,
    };
  });

  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new API key for the authenticated user.",
        body: createApiKeyInputSchema,
        response: {
          ...withCreatedResponse(apiKeyCreatedSchema, "API key created"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { label, permission } = request.body;

      const { count, error: countError } = await client
        .from("api_keys")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        return reply.status(500).send({ error: countError.message });
      }

      if ((count ?? 0) >= API_KEY_LIMITS.maxPerUser) {
        return reply.status(409).send({
          error: `Maximum of ${API_KEY_LIMITS.maxPerUser} API keys per account`,
        });
      }

      const { keyId, secret, fullKey } = generateApiKeyMaterial();
      const keyHash = hashApiKey(fullKey, pepper);
      const keyPrefix = formatApiKeyPrefix(keyId, secret);

      const { data, error } = await client
        .from("api_keys")
        .insert({
          user_id: user.id,
          key_id: keyId,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          label: label.trim(),
          permission,
        })
        .select("id, label, permission, key_prefix, last_used_at, created_at")
        .single();

      if (error || !data) {
        request.log.error({ err: error }, "Failed to create API key");
        return reply.status(500).send({ error: error?.message ?? "Failed to create API key" });
      }

      return reply.status(201).send({
        ...mapApiKeyRow(data),
        secret: fullKey,
      });
    },
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Update an API key label.",
        params: uuidParamSchema,
        body: updateApiKeyLabelInputSchema,
        response: withOkResponse(apiKeyListItemSchema, "Updated API key"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { data, error } = await client
        .from("api_keys")
        .update({ label: request.body.label.trim() })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, label, permission, key_prefix, last_used_at, created_at")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return reply.status(404).send({ error: "API key not found" });
        }
        return reply.status(500).send({ error: error.message });
      }

      return mapApiKeyRow(data);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Revoke and delete an API key.",
        params: uuidParamSchema,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { data, error } = await client
        .from("api_keys")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!data) {
        return reply.status(404).send({ error: "API key not found" });
      }

      return reply.status(204).send(null);
    },
  );
}
