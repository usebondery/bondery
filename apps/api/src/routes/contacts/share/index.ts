import { apiSuccessResponseSchema, shareContactRequestSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { shareContact } from "../../../domains/contacts/index.js";
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";

export const shareRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Share"];
    }
  });

  fastify.post(
    "/",
    {
      schema: {
        body: shareContactRequestSchema,
        description: "Share a contact via email with selected fields.",
        response: withOkResponse(apiSuccessResponseSchema, "Contact shared successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return shareContact(ctx, request.body);
    },
  );
};
