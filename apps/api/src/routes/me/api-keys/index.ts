/**
 * API key management routes (session-only).
 */

import {
  apiKeyCreatedSchema,
  apiKeyListItemSchema,
  apiKeysListResponseSchema,
  createApiKeyInputSchema,
  updateApiKeyLabelInputSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import {
  conflictResponse,
  noContentResponse,
  standardErrorResponses,
} from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { createApiKey, deleteApiKey, updateApiKeyLabel } from "../../../services/me/api-keys.js";

export const meApiKeysRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  const pepper = fastify.config.BONDERY_PRIVATE_API_KEY_PEPPER.trim();

  fastify.get(
    "/",
    {
      schema: {
        description: "List API keys for the authenticated user.",
        response: withOkResponse(apiKeysListResponseSchema, "API key list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);

      const { data, error } = await client
        .from("api_keys")
        .select("id, label, permission, key_prefix, last_used_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        request.log.error({ err: error }, "Failed to list API keys");
        throw internal("internal_server_error", error.message);
      }

      const apiKeys = (data ?? []).map((row) => ({
        createdAt: row.created_at,
        id: row.id,
        keyPrefix: row.key_prefix,
        label: row.label,
        lastUsedAt: row.last_used_at,
        permission: row.permission === "read" ? ("read" as const) : ("full" as const),
      }));

      return {
        apiKeys,
        totalCount: apiKeys.length,
      };
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        body: createApiKeyInputSchema,
        description: "Create a new API key for the authenticated user.",
        response: {
          ...withCreatedResponse(apiKeyCreatedSchema, "API key created"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: createApiKeyInputSchema }, async (ctx, { body }, reply) => {
      const result = await createApiKey(ctx, body, pepper);
      reply.status(201);
      return result;
    }),
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        body: updateApiKeyLabelInputSchema,
        description: "Update an API key label.",
        params: uuidParamSchema,
        response: withOkResponse(apiKeyListItemSchema, "Updated API key"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(
      { body: updateApiKeyLabelInputSchema, params: uuidParamSchema },
      async (ctx, { body, params }) => updateApiKeyLabel(ctx, params.id, body.label),
    ),
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
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }, reply) => {
      await deleteApiKey(ctx, params.id);
      return reply.status(204).send(null);
    }),
  );
};
