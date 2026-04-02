import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import { parseLinkedInCsvUpload } from "./parser.js";
import { assignContactsToDefaultImportGroup } from "../../../lib/default-import-groups.js";
import type { LinkedInImportCommitResponse, LinkedInParseResponse } from "@bondery/types";

const LinkedInCommitContactSchema = Type.Object({
  firstName: Type.String(),
  lastName: Type.Union([Type.String(), Type.Null()]),
  middleName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  linkedinUsername: Type.String(),
  email: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  position: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  company: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  connectedAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  isValid: Type.Boolean(),
});

const LinkedInCommitBody = Type.Object({
  contacts: Type.Array(LinkedInCommitContactSchema, { minItems: 1 }),
});

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
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Import"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post("/parse", async (request: FastifyRequest, reply: FastifyReply) => {
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
    { schema: { body: LinkedInCommitBody } },
    async (
      request: FastifyRequest<{ Body: typeof LinkedInCommitBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const rawContacts = request.body.contacts;

      // De-duplicate by handle, drop invalid rows up-front.
      const seenHandles = new Set<string>();
      const contacts = rawContacts.filter((contact) => {
        if (!contact.isValid || !contact.linkedinUsername) return false;
        const handle = contact.linkedinUsername.trim();
        if (!handle || seenHandles.has(handle)) return false;
        seenHandles.add(handle);
        return true;
      });

      const skippedCount = rawContacts.length - contacts.length;

      if (contacts.length === 0) {
        return {
          importedCount: 0,
          updatedCount: 0,
          skippedCount,
        } satisfies LinkedInImportCommitResponse;
      }

      const now = new Date().toISOString();

      // ── Step 1: Single query to find all existing person_ids by handle ──────
      const handles = contacts.map((c) => c.linkedinUsername.trim());

      const { data: existingSocialRows, error: socialLookupError } = await client
        .from("people_socials")
        .select("handle, person_id")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .in("handle", handles);

      if (socialLookupError) {
        return reply.status(500).send({ error: socialLookupError.message });
      }

      const handleToPersonId = new Map<string, string>();
      for (const row of existingSocialRows ?? []) {
        if (row.handle && row.person_id) {
          handleToPersonId.set(row.handle.trim(), row.person_id);
        }
      }

      const toInsert = contacts.filter((c) => !handleToPersonId.has(c.linkedinUsername.trim()));
      const toUpdate = contacts.filter((c) => handleToPersonId.has(c.linkedinUsername.trim()));

      // ── Step 2a: Bulk insert new people ──────────────────────────────────────
      let importedCount = 0;
      let importedPersonIds: string[] = [];

      if (toInsert.length > 0) {
        const { data: insertedPeople, error: insertError } = await client
          .from("people")
          .insert(
            toInsert.map((c) => ({
              user_id: user.id,
              first_name: c.firstName,
              middle_name: c.middleName,
              last_name: c.lastName,
              headline: buildImportedTitle(c.position ?? null, c.company ?? null),
              myself: false,
              last_interaction: now,
            })),
          )
          .select("id, first_name, last_name");

        if (insertError || !insertedPeople) {
          return reply.status(500).send({ error: insertError?.message ?? "Insert failed" });
        }

        // Map back: inserted rows come back in the same order as the input array.
        for (let i = 0; i < toInsert.length; i++) {
          const inserted = insertedPeople[i];
          if (inserted) {
            handleToPersonId.set(toInsert[i].linkedinUsername.trim(), inserted.id);
          }
        }

        importedCount = insertedPeople.length;
        importedPersonIds = insertedPeople.map((person) => person.id);
      }

      // ── Step 2b: Bulk update existing people ─────────────────────────────────
      // Supabase doesn't support bulk UPDATE with different values per row,
      // so we run individual updates concurrently (Promise.all) instead of sequentially.
      let updatedCount = 0;

      if (toUpdate.length > 0) {
        const updateResults = await Promise.all(
          toUpdate.map((c) =>
            client
              .from("people")
              .update({
                first_name: c.firstName,
                middle_name: c.middleName,
                last_name: c.lastName,
                headline: buildImportedTitle(c.position ?? null, c.company ?? null),
              })
              .eq("user_id", user.id)
              .eq("id", handleToPersonId.get(c.linkedinUsername.trim())!),
          ),
        );

        updatedCount = updateResults.filter((r) => !r.error).length;
      }

      // ── Step 3: Bulk upsert social media rows ─────────────────────────────────
      const socialRows = contacts
        .map((c) => {
          const personId = handleToPersonId.get(c.linkedinUsername.trim());
          if (!personId) return null;
          return {
            user_id: user.id,
            person_id: personId,
            platform: "linkedin" as const,
            handle: c.linkedinUsername.trim(),
            connected_at: c.connectedAt ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (socialRows.length > 0) {
        const { error: socialUpsertError } = await client
          .from("people_socials")
          .upsert(socialRows, { onConflict: "user_id,person_id,platform" });

        if (socialUpsertError) {
          return reply.status(500).send({ error: socialUpsertError.message });
        }
      }

      // ── Step 4: Bulk insert emails (only contacts that have one) ─────────────
      const contactsWithEmail = contacts.filter((c) => c.email);

      if (contactsWithEmail.length > 0) {
        const personIds = contactsWithEmail
          .map((c) => handleToPersonId.get(c.linkedinUsername.trim()))
          .filter((id): id is string => !!id);

        // Fetch all existing emails for affected people in one query.
        const { data: existingEmails } = await client
          .from("people_emails")
          .select("person_id, value")
          .eq("user_id", user.id)
          .in("person_id", personIds);

        const existingEmailsByPerson = new Map<string, string[]>();
        for (const row of existingEmails ?? []) {
          if (!row.person_id) continue;
          const list = existingEmailsByPerson.get(row.person_id) ?? [];
          list.push(row.value.trim().toLowerCase());
          existingEmailsByPerson.set(row.person_id, list);
        }

        const emailRowsToInsert = contactsWithEmail
          .map((c) => {
            const personId = handleToPersonId.get(c.linkedinUsername.trim());
            if (!personId || !c.email) return null;
            const existing = existingEmailsByPerson.get(personId) ?? [];
            if (existing.includes(c.email.trim().toLowerCase())) return null;
            return {
              user_id: user.id,
              person_id: personId,
              value: c.email,
              type: "work" as const,
              preferred: existing.length === 0,
              sort_order: existing.length,
            };
          })
          .filter((row): row is NonNullable<typeof row> => row !== null);

        if (emailRowsToInsert.length > 0) {
          // Ignore conflicts — duplicate emails are silently skipped.
          await client.from("people_emails").insert(emailRowsToInsert);
        }
      }

      try {
        await assignContactsToDefaultImportGroup(
          client,
          user.id,
          "linkedin_import",
          importedPersonIds,
        );
      } catch (groupError) {
        const message =
          groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
        return reply.status(500).send({ error: message });
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
