/**
 * Contacts — Keep in Touch Routes
 * Count endpoint for shell badge (overdue follow-ups).
 */

import { keepInTouchCountResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getKeepInTouchOverdueCount } from "../../domains/contacts/keep-in-touch.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";

export function registerKeepInTouchRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/keep-in-touch/count",
    {
      schema: {
        description:
          "Count keep-in-touch contacts that are overdue (missing last interaction or past due date).",
        response: withOkResponse(keepInTouchCountResponseSchema, "Keep in touch overdue count"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => getKeepInTouchOverdueCount(ctx)),
  );
}
