/**
 * Contacts — Merge Execute Route
 * POST /merge: merges two duplicate contacts, left person absorbs right.
 */

import { mergeContactsResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { mergeContacts } from "../../../domains/contacts/merge.js";
import { mergeContactsBodySchema } from "../../../lib/contacts/merge-helpers.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerMergeExecuteRoute(fastify: AppFastifyInstance): void {
  fastify.post(
    "/merge",
    {
      schema: {
        body: mergeContactsBodySchema,
        description: "Merge two duplicate contacts; the left contact survives.",
        response: withOkResponse(mergeContactsResponseSchema, "Contacts merged"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: mergeContactsBodySchema }, async (ctx, { body }) => {
      const { data } = await mergeContacts(ctx, {
        conflictResolutions: body.conflictResolutions,
        leftPersonId: body.leftPersonId,
        rightPersonId: body.rightPersonId,
      });
      return data;
    }),
  );
}
