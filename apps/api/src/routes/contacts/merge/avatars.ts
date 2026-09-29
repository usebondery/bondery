/**
 * Contacts — Merge avatar identity
 * GET /merge/avatars: whether two contacts store the same avatar bytes.
 */

import { mergeAvatarIdentityResponseSchema } from "@bondery/schemas";
import { mergeAvatarIdentityQuerySchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getMergeAvatarIdentity } from "../../../domains/contacts/merge-avatars.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerMergeAvatarIdentityRoute(fastify: AppFastifyInstance): void {
  fastify.get(
    "/merge/avatars",
    {
      schema: {
        description: "Check whether two contacts have identical avatar image bytes.",
        querystring: mergeAvatarIdentityQuerySchema,
        response: withOkResponse(mergeAvatarIdentityResponseSchema, "Avatar identity"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ query: mergeAvatarIdentityQuerySchema }, async (ctx, { query }) =>
      getMergeAvatarIdentity(ctx, query.leftPersonId, query.rightPersonId),
    ),
  );
}
