/**
 * Extension POST route - Create or update contact from browser extension
 */

import { redirectResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { upsertContactFromExtension } from "../../domains/contacts/extension-upsert.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import { redirectBodySchema } from "./schemas.js";

export function registerPostRoute(fastify: AppFastifyInstance): void {
  fastify.post(
    "/",
    {
      schema: {
        body: redirectBodySchema,
        description: "Create or find a contact from browser extension scraped data.",
        response: withOkResponse(redirectResponseSchema, "Extension contact result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      return upsertContactFromExtension(ctx, request.body);
    }),
  );
}
