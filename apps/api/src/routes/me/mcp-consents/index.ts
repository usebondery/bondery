/**
 * MCP OAuth consent listing and revoke (session-only). First-party clients
 * are excluded — those consents are not AI-assistant grants.
 */

import { mcpConsentsListResponseSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import { noContentResponse, standardErrorResponses } from "@bondery/schemas/http/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { consumeStepUpHeader } from "../../../lib/auth/step-up-redis.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { listMcpConsents, revokeMcpConsent } from "../../../services/me/mcp-consents.js";

export const meMcpConsentsRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.get(
    "/",
    {
      schema: {
        description: "List MCP OAuth consents for the authenticated user.",
        response: withOkResponse(mcpConsentsListResponseSchema, "MCP consent list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { user } = getAuth(request);
      return listMcpConsents(user.id);
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        description:
          "Revoke an MCP OAuth consent. Requires a one-shot `X-Bondery-Step-Up` token from `POST /me/step-up`.",
        params: uuidParamSchema,
        response: {
          ...noContentResponse,
          ...standardErrorResponses,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params, request }, reply) => {
      await consumeStepUpHeader(ctx.user.id, request.headers);
      await revokeMcpConsent(ctx, params.id);
      return reply.status(204).send(null);
    }),
  );
};
