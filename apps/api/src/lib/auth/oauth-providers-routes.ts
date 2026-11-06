import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { oauthProvidersResponseSchema } from "@bondery/schemas/oauth-providers";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import type { AppFastifyInstance } from "../platform/fastify-types.js";
import { withOkResponse } from "../platform/openapi/responses.js";
import { oauthProviders } from "./oauth-provider-config.js";

const DESCRIPTION =
  "Public snapshot of which sign-in providers are configured on this API process. " +
  "Booleans only — no client ids, secrets, SMTP credentials, or reasons. " +
  "The bitmap is computed at API boot from OAuth credentials and SMTP env vars; restart the API after changing them. " +
  "Unauthenticated. Cached by clients for up to 60 seconds.";

export function registerOAuthProvidersRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    API_ROUTES.OAUTH_PROVIDERS,
    {
      schema: {
        description: DESCRIPTION,
        response: withOkResponse(oauthProvidersResponseSchema, "Configured social OAuth providers"),
        summary: "List sign-in providers",
        tags: ["Auth"],
      } satisfies FastifyZodOpenApiSchema,
    },
    async (_request, reply) => {
      return reply.header("Cache-Control", "public, max-age=60").send({ oauthProviders });
    },
  );
}
