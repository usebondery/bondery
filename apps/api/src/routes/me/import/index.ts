import { importResultResponseSchema } from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { applyBonderyImport } from "../../../domains/me/import.js";
import { domainContextFromRequest } from "../../../lib/platform/domain-context.js";
import { badRequest } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { EXPORT_TIER } from "../../../lib/platform/rate-limit.js";

export const meImportRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  fastify.post(
    "/",
    {
      config: { rateLimit: EXPORT_TIER },
      schema: {
        description:
          "Import a Bondery export ZIP into the current account. Additive only — existing rows are never updated or deleted.",
        response: withOkResponse(importResultResponseSchema, "Bondery import result counts"),
        summary: "Import Bondery data",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      let zipBuffer: Buffer | null = null;

      for await (const part of request.parts()) {
        if (part.type !== "file") {
          continue;
        }
        const content = await part.toBuffer();
        if (!content || content.length === 0 || zipBuffer) {
          continue;
        }
        zipBuffer = content;
      }

      if (!zipBuffer) {
        throw badRequest("A ZIP file is required", "import_bondery_invalid");
      }

      return applyBonderyImport(ctx, zipBuffer);
    },
  );
};
