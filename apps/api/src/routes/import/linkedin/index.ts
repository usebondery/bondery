import type { LinkedInParseResponse } from "@bondery/schemas";
import {
  linkedInImportCommitRequestSchema,
  linkedInImportCommitResponseSchema,
  linkedInParseResponseSchema,
} from "@bondery/schemas";
import { IMPORT_HANDLE_LOOKUP_CHUNK_SIZE } from "@bondery/schemas/constants";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { commitLinkedInImport } from "../../../domains/import/linkedin.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { badRequest } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { IMPORT_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { parseLinkedInCsvUpload } from "./parser.js";

export const linkedInImportRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Import"];
    }
  });

  fastify.post(
    "/parse",
    {
      schema: {
        description: "Parse a LinkedIn CSV export and preview contacts for import.",
        response: withOkResponse(linkedInParseResponseSchema, "Parsed LinkedIn contacts"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);

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

        const contacts = parseLinkedInCsvUpload(files);
        const normalizedHandles = Array.from(
          new Set(
            contacts
              .map((contact) => contact.linkedinUsername.trim().toLowerCase())
              .filter((handle) => handle.length > 0),
          ),
        );

        const existingHandleSet = new Set<string>();

        if (normalizedHandles.length > 0) {
          for (
            let index = 0;
            index < normalizedHandles.length;
            index += IMPORT_HANDLE_LOOKUP_CHUNK_SIZE
          ) {
            const handleChunk = normalizedHandles.slice(
              index,
              index + IMPORT_HANDLE_LOOKUP_CHUNK_SIZE,
            );

            const { data: existingRows, error: existingError } = await client
              .from("people_socials")
              .select("handle")
              .eq("user_id", user.id)
              .eq("platform", "linkedin")
              .in("handle", handleChunk);

            if (existingError) {
              throw new Error(existingError.message);
            }

            for (const row of existingRows || []) {
              if (typeof row.handle !== "string") {
                continue;
              }

              // Decode percent-encoded handles (e.g. from old imports) so they
              // match the decoded form produced by the current parser.
              let decodedHandle: string;
              try {
                decodedHandle = decodeURIComponent(row.handle.trim());
              } catch {
                decodedHandle = row.handle.trim();
              }

              const normalizedHandle = decodedHandle.toLowerCase();
              if (normalizedHandle.length > 0) {
                existingHandleSet.add(normalizedHandle);
              }
            }
          }
        }

        const contactsWithExistingState = contacts.map((contact) => {
          const normalizedHandle = contact.linkedinUsername.trim().toLowerCase();
          return {
            ...contact,
            alreadyExists: normalizedHandle.length > 0 && existingHandleSet.has(normalizedHandle),
          };
        });

        const response: LinkedInParseResponse = {
          contacts: contactsWithExistingState,
          invalidCount: contactsWithExistingState.filter((item) => !item.isValid).length,
          totalCount: contactsWithExistingState.length,
          validCount: contactsWithExistingState.filter((item) => item.isValid).length,
        };

        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to parse LinkedIn export";
        throw badRequest(message, "bad_request");
      }
    },
  );

  fastify.post(
    "/commit",
    {
      config: { rateLimit: IMPORT_TIER },
      schema: {
        body: linkedInImportCommitRequestSchema,
        description: "Commit a LinkedIn import from previously parsed contacts.",
        response: withOkResponse(linkedInImportCommitResponseSchema, "LinkedIn import result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      return commitLinkedInImport(ctx, request.body.contacts);
    }),
  );
};
