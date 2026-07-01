import type { AppRoutePlugin } from "../../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/auth";
import { registerApiKeyProtectedHooks } from "../../../lib/api-key-access";
import { applyOpenApiRouteMeta } from "../../../lib/openapi-route-meta";
import { withOkResponse } from "../../../lib/openapi-route-responses";
import { apiSuccessResponseSchema, shareContactRequestSchema } from "@bondery/schemas";
import { shareContact } from "./lib";

export const shareRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Share"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "integration" });
  });
  registerApiKeyProtectedHooks(fastify);

  fastify.post(
    "/",
    {
      schema: {
        description: "Share a contact via email with selected fields.",
        body: shareContactRequestSchema,
        response: withOkResponse(
          apiSuccessResponseSchema,
          "Contact shared successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { user, client } = getAuth(request);
      const result = await shareContact(client, user, request.body);

      if ("error" in result) {
        return reply.status(result.status).send({ error: result.error });
      }

      return result;
    },
  );
};
