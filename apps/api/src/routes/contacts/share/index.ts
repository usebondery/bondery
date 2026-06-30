import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/auth.js";
import { registerApiKeyProtectedHooks } from "../../../lib/api-key-access.js";
import { shareContactRequestSchema } from "@bondery/schemas";
import { shareContact } from "./lib.js";

export const shareRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Share"];
    }
  });
  registerApiKeyProtectedHooks(fastify);

  fastify.post(
    "/",
    {
      schema: {
        body: shareContactRequestSchema,
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
}
