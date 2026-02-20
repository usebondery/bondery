import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import { findPersonIdBySocialMedia, upsertContactSocialMedia } from "../lib/social-media.js";
import { parseInstagramExportUpload } from "../lib/instagram-import.js";
import type {
  InstagramImportCommitRequest,
  InstagramImportCommitResponse,
  InstagramImportStrategy,
  InstagramParseResponse,
} from "@bondery/types";

const SUPPORTED_STRATEGIES: InstagramImportStrategy[] = [
  "close_friends",
  "following",
  "followers",
  "following_and_followers",
  "mutual_following",
];
const HANDLE_LOOKUP_CHUNK_SIZE = 150;

function resolveStrategy(input: unknown): InstagramImportStrategy {
  if (typeof input !== "string") {
    return "following_and_followers";
  }

  const normalized = input.trim() as InstagramImportStrategy;
  return SUPPORTED_STRATEGIES.includes(normalized) ? normalized : "following_and_followers";
}

export async function instagramImportRoutes(fastify: FastifyInstance) {
  fastify.post("/parse", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

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
            fileName: part.filename,
            content,
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
        for (let index = 0; index < normalizedHandles.length; index += HANDLE_LOOKUP_CHUNK_SIZE) {
          const handleChunk = normalizedHandles.slice(index, index + HANDLE_LOOKUP_CHUNK_SIZE);

          const { data: existingRows, error: existingError } = await auth.client
            .from("people_social_media")
            .select("handle")
            .eq("user_id", auth.user.id)
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
        totalCount: contactsWithExistingState.length,
        validCount: contactsWithExistingState.filter((item) => item.isValid).length,
        invalidCount: contactsWithExistingState.filter((item) => !item.isValid).length,
      };

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse Instagram export";
      return reply.status(400).send({ error: message });
    }
  });

  fastify.post(
    "/commit",
    async (
      request: FastifyRequest<{ Body: InstagramImportCommitRequest }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) {
        return;
      }

      const { client, user } = auth;
      const contacts = Array.isArray(request.body?.contacts) ? request.body.contacts : [];

      if (contacts.length === 0) {
        return reply.status(400).send({ error: "No contacts provided" });
      }

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      const seenHandles = new Set<string>();

      for (const contact of contacts) {
        if (!contact.isValid || !contact.instagramUsername) {
          skippedCount += 1;
          continue;
        }

        const handle = contact.instagramUsername.trim().toLowerCase();
        if (!handle || seenHandles.has(handle)) {
          skippedCount += 1;
          continue;
        }

        seenHandles.add(handle);

        try {
          const existingPersonId = await findPersonIdBySocialMedia(
            client,
            user.id,
            "instagram",
            handle,
          );

          let personId = existingPersonId;

          if (!personId) {
            const { data: createdPerson, error: createError } = await client
              .from("people")
              .insert({
                user_id: user.id,
                first_name: contact.firstName,
                middle_name: contact.middleName,
                last_name: contact.lastName,
                myself: false,
                last_interaction: new Date().toISOString(),
              })
              .select("id")
              .single();

            if (createError || !createdPerson) {
              skippedCount += 1;
              continue;
            }

            personId = createdPerson.id;
            importedCount += 1;
          } else {
            const { error: updateError } = await client
              .from("people")
              .update({
                first_name: contact.firstName,
                middle_name: contact.middleName,
                last_name: contact.lastName,
              })
              .eq("user_id", user.id)
              .eq("id", personId);

            if (updateError) {
              skippedCount += 1;
              continue;
            }

            updatedCount += 1;
          }

          await upsertContactSocialMedia(
            client,
            user.id,
            personId,
            "instagram",
            handle,
            contact.connectedAt,
          );
        } catch {
          skippedCount += 1;
        }
      }

      const response: InstagramImportCommitResponse = {
        importedCount,
        updatedCount,
        skippedCount,
      };

      return response;
    },
  );
}
