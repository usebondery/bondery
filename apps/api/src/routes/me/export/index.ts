import { exportSummaryResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { generateExportZip, getExportSummary } from "../../../domains/me/export.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { EXPORT_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { captureProductEvent } from "../../../services/analytics/posthog-capture.js";

export const meExportRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.get(
    "/summary",
    {
      config: { rateLimit: EXPORT_TIER },
      schema: {
        description: "Count CRM records included in a Bondery data export for the current user.",
        response: withOkResponse(exportSummaryResponseSchema, "Export summary counts"),
        summary: "Count export records",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => getExportSummary(ctx)),
  );

  fastify.get(
    "/",
    {
      config: { rateLimit: EXPORT_TIER },
      schema: {
        description: "Download a ZIP of the authenticated user's Bondery CRM data.",
        response: withOkResponse(
          z.string().meta({
            description: "ZIP archive of Bondery export files",
            example: "PK\u0003\u0004",
          }),
          "Bondery export ZIP",
        ),
        summary: "Download your data",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, _route, reply) => {
      const { buffer, counts, filename, isEmpty } = await generateExportZip(ctx);

      try {
        await captureProductEvent(ctx, "account_settings:export_generate", {
          groups_count: counts.groups,
          interactions_count: counts.interactions,
          is_empty: isEmpty,
          people_count: counts.people,
          tags_count: counts.tags,
        });
      } catch {
        // Analytics must not block the download after the ZIP is ready.
      }

      reply.header("Content-Type", "application/zip");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);
      return reply.send(buffer);
    }),
  );
};
