import type { InstagramImportStrategy, InstagramParseResponse } from "@bondery/schemas";
import {
  instagramImportCommitRequestSchema,
  instagramImportCommitResponseSchema,
  instagramParseResponseSchema,
} from "@bondery/schemas";
import { IMPORT_HANDLE_LOOKUP_CHUNK_SIZE } from "@bondery/schemas/constants";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { commitInstagramImport } from "../../../domains/import/instagram.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { badRequest } from "../../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { IMPORT_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";
import { parseInstagramExportUpload } from "./parser.js";

const SUPPORTED_STRATEGIES: InstagramImportStrategy[] = [
  "close_friends",
  "following",
  "followers",
  "following_and_followers",
  "mutual_following",
];

function resolveStrategy(input: unknown): InstagramImportStrategy {
  if (typeof input !== "string") {
    return "following_and_followers";
  }

  const normalized = input.trim() as InstagramImportStrategy;
  return SUPPORTED_STRATEGIES.includes(normalized) ? normalized : "following_and_followers";
}

export const instagramImportRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Import"];
    }
  });

  fastify.post(
    "/parse",
    {
      schema: {
        description: "Parse an Instagram export and preview contacts for import.",
        response: withOkResponse(instagramParseResponseSchema, "Parsed Instagram contacts"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);

      try {
        const files: Array<{ fileName: string; content: Buffer }> = [];
        let strategy: InstagramImportStrategy = "following_and_followers";

        for await (const part of request.parts()) {
          if (part.type === "file") {
            const content = await part.toBuffer();
            if (!content || !part.filename) {
              continue;
            }

            files.push({
              content,
              fileName: part.filename,
            });

            continue;
          }

          if (part.fieldname === "strategy") {
            strategy = resolveStrategy(part.value);
          }
        }

        const contacts = parseInstagramExportUpload(files, strategy);
        const normalizedHandles = Array.from(
          new Set(
            contacts
              .map((contact) => contact.instagramUsername.trim().toLowerCase())
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
              .eq("platform", "instagram")
              .in("handle", handleChunk);

            if (existingError) {
              throw new Error(existingError.message);
            }

            for (const row of existingRows || []) {
              if (typeof row.handle !== "string") {
                continue;
              }

              const normalizedHandle = row.handle.trim().toLowerCase();
              if (normalizedHandle.length > 0) {
                existingHandleSet.add(normalizedHandle);
              }
            }
          }
        }

        const contactsWithExistingState = contacts.map((contact) => {
          const normalizedHandle = contact.instagramUsername.trim().toLowerCase();
          return {
            ...contact,
            alreadyExists: normalizedHandle.length > 0 && existingHandleSet.has(normalizedHandle),
          };
        });

        const response: InstagramParseResponse = {
          contacts: contactsWithExistingState,
          invalidCount: contactsWithExistingState.filter((item) => !item.isValid).length,
          totalCount: contactsWithExistingState.length,
          validCount: contactsWithExistingState.filter((item) => item.isValid).length,
        };

        return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to parse Instagram export";
        throw badRequest(message, "bad_request");
      }
    },
  );

  fastify.post(
    "/commit",
    {
      config: { rateLimit: IMPORT_TIER },
      schema: {
        body: instagramImportCommitRequestSchema,
        description: "Commit an Instagram import from previously parsed contacts.",
        response: withOkResponse(instagramImportCommitResponseSchema, "Instagram import result"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: instagramImportCommitRequestSchema }, async (ctx, { body }) =>
      commitInstagramImport(ctx, body.contacts),
    ),
  );
};
