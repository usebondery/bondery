import type { VCardParseResponse } from "@bondery/schemas";
import {
  vcardImportCommitRequestSchema,
  vcardImportCommitResponseSchema,
  vcardParseResponseSchema,
} from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { commitVCardImport } from "../../../domains/import/vcard.js";
import { badRequest } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { IMPORT_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { parseVCardUpload } from "./parser.js";

export const vcardImportRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Import"];
    }
  });

  fastify.post(
    "/parse",
    {
      schema: {
        description: "Parse a vCard file and preview contacts for import.",
        response: withOkResponse(vcardParseResponseSchema, "Parsed vCard contacts"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      try {
        const files: Array<{ fileName: string; content: Buffer }> = [];

        for await (const part of request.parts()) {
          if (part.type !== "file") {
            continue;
          }

          const content = await part.toBuffer();
          if (!content || !part.filename) {
            continue;
          }

          files.push({
            content,
            fileName: part.filename,
          });
        }

        const contacts = await parseVCardUpload(files);

        const response: VCardParseResponse = {
          contacts,
          invalidCount: contacts.filter((item) => !item.isValid).length,
          totalCount: contacts.length,
          validCount: contacts.filter((item) => item.isValid).length,
        };

        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to parse vCard file";
        throw badRequest(message, "bad_request");
      }
    },
  );

  fastify.post(
    "/commit",
    {
      config: { rateLimit: IMPORT_TIER },
      schema: {
        body: vcardImportCommitRequestSchema,
        description: "Commit a vCard import from previously parsed contacts.",
        response: withOkResponse(vcardImportCommitResponseSchema, "vCard import result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      return commitVCardImport(ctx, request.body.contacts);
    }),
  );
};
