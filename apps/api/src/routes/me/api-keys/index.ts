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
import { consumeStepUpHeader } from "../../../lib/auth/step-up-redis.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  updateApiKeyLabel,
} from "../../../services/me/api-keys.js";

export const meApiKeysRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "List API keys for the authenticated user.",
        response: withOkResponse(apiKeysListResponseSchema, "API key list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);
      return listApiKeys(user.id);
    },
  );

  fastify.post(
    "/",
    {
      schema: {
        body: createApiKeyInputSchema,
        description:
          "Create a new API key for the authenticated user. Requires a one-shot `X-Bondery-Step-Up` token from `POST /me/step-up`.",
        response: {
          ...withCreatedResponse(apiKeyCreatedSchema, "API key created"),
          ...conflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: createApiKeyInputSchema }, async (ctx, { body, request }, reply) => {
      await consumeStepUpHeader(ctx.user.id, request.headers);
      const result = await createApiKey(ctx, body);
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
        description:
          "Revoke and delete an API key. Requires a one-shot `X-Bondery-Step-Up` token from `POST /me/step-up`.",
        params: uuidParamSchema,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params, request }, reply) => {
      await consumeStepUpHeader(ctx.user.id, request.headers);
      await deleteApiKey(ctx, params.id);
      return reply.status(204).send(null);
    }),
  );
};
