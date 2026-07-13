import { apiSuccessResponseSchema, shareContactRequestSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { shareContact } from "../../../services/contacts/share.js";

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
      const { user, client } = getAuth(request);
      return shareContact(client, user, request.body);
    },
  );
};
