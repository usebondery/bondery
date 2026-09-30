import { API_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers";
import type { AppFastifyInstance } from "../platform/fastify-types.js";

function docsApiReferenceUrl(websiteOrigin: string): string {
  return `${websiteOrigin.replace(/\/+$/, "")}${WEBSITE_ROUTES.DOCS_API_REFERENCE}`;
}

/** Convenience pointers to the website OpenAPI reference. Not part of the REST API. */
export function registerDocsRedirectRoutes(fastify: AppFastifyInstance): void {
  const location = docsApiReferenceUrl(fastify.config.BONDERY_PUBLIC_WEBSITE_URL);

  for (const url of [API_ROUTES.API_REFERENCE, API_ROUTES.DOCS_API]) {
    fastify.route({
      config: { rateLimit: false },
      handler: async (_request, reply) => reply.redirect(location, 308),
      method: ["GET", "HEAD"],
      schema: { hide: true },
      url,
    });
  }
}
