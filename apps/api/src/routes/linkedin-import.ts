import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import { parseLinkedInCsvUpload } from "../lib/linkedin-import.js";
import { findPersonIdBySocialMedia, upsertContactSocialMedia } from "../lib/social-media.js";
import type {
  LinkedInImportCommitRequest,
  LinkedInImportCommitResponse,
  LinkedInParseResponse,
} from "@bondery/types";

const HANDLE_LOOKUP_CHUNK_SIZE = 150;

function buildImportedTitle(position: string | null, company: string | null): string | null {
  const normalizedPosition = typeof position === "string" ? position.trim() : "";
  const normalizedCompany = typeof company === "string" ? company.trim() : "";

  if (normalizedPosition && normalizedCompany) {
    return `${normalizedPosition} @${normalizedCompany}`;
  }

  if (normalizedPosition) {
    return normalizedPosition;
  }

  if (normalizedCompany) {
    return `@${normalizedCompany}`;
  }

  return null;
}

export async function linkedInImportRoutes(fastify: FastifyInstance) {
  fastify.post("/parse", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) {
      return;
    }

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
          fileName: part.filename,
          content,
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
        for (let index = 0; index < normalizedHandles.length; index += HANDLE_LOOKUP_CHUNK_SIZE) {
          const handleChunk = normalizedHandles.slice(index, index + HANDLE_LOOKUP_CHUNK_SIZE);

          const { data: existingRows, error: existingError } = await auth.client
            .from("people_social_media")
            .select("handle")
            .eq("user_id", auth.user.id)
            .eq("platform", "linkedin")
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
        const normalizedHandle = contact.linkedinUsername.trim().toLowerCase();
        return {
          ...contact,
          alreadyExists: normalizedHandle.length > 0 && existingHandleSet.has(normalizedHandle),
        };
      });

      const response: LinkedInParseResponse = {
        contacts: contactsWithExistingState,
        totalCount: contactsWithExistingState.length,
        validCount: contactsWithExistingState.filter((item) => item.isValid).length,
        invalidCount: contactsWithExistingState.filter((item) => !item.isValid).length,
      };

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse LinkedIn export";
      return reply.status(400).send({ error: message });
    }
  });

  fastify.post(
    "/commit",
    async (request: FastifyRequest<{ Body: LinkedInImportCommitRequest }>, reply: FastifyReply) => {
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
        if (!contact.isValid || !contact.linkedinUsername) {
          skippedCount += 1;
          continue;
        }

        const handle = contact.linkedinUsername.trim();
        if (!handle || seenHandles.has(handle)) {
          skippedCount += 1;
          continue;
        }

        seenHandles.add(handle);

        try {
          const existingPersonId = await findPersonIdBySocialMedia(
            client,
            user.id,
            "linkedin",
            handle,
          );
          const importedTitle = buildImportedTitle(contact.position, contact.company);

          let personId = existingPersonId;

          if (!personId) {
            const { data: createdPerson, error: createError } = await client
              .from("people")
              .insert({
                user_id: user.id,
                first_name: contact.firstName,
                middle_name: contact.middleName,
                last_name: contact.lastName,
                title: importedTitle,
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
                title: importedTitle,
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
            "linkedin",
            handle,
            contact.connectedAt,
          );

          if (contact.email) {
            const { data: existingEmails, error: emailFetchError } = await client
              .from("people_emails")
              .select("id, value")
              .eq("user_id", user.id)
              .eq("person_id", personId);

            if (emailFetchError) {
              skippedCount += 1;
              continue;
            }

            const hasEmail = (existingEmails || []).some(
              (email) => email.value.trim().toLowerCase() === contact.email?.trim().toLowerCase(),
            );

            if (!hasEmail) {
              const { error: emailInsertError } = await client.from("people_emails").insert({
                user_id: user.id,
                person_id: personId,
                value: contact.email,
                type: "work",
                preferred: (existingEmails || []).length === 0,
                sort_order: (existingEmails || []).length,
              });

              if (emailInsertError) {
                skippedCount += 1;
                continue;
              }
            }
          }
        } catch {
          skippedCount += 1;
        }
      }

      const response: LinkedInImportCommitResponse = {
        importedCount,
        updatedCount,
        skippedCount,
      };

      return response;
    },
  );
}
