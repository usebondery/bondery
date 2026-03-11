import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import {
  assignContactsToDefaultImportGroup,
  toInstagramImportGroupKeys,
  type DefaultImportGroupKey,
} from "../../lib/default-import-groups.js";
import { parseInstagramExportUpload } from "./parser.js";
import type {
  InstagramImportCommitResponse,
  InstagramImportSource,
  InstagramImportStrategy,
  InstagramParseResponse,
} from "@bondery/types";

const InstagramCommitContactSchema = Type.Object({
  firstName: Type.String(),
  middleName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  lastName: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  instagramUsername: Type.String(),
  connectedAt: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  isValid: Type.Boolean(),
  sources: Type.Optional(Type.Array(Type.String())),
});

const InstagramCommitBody = Type.Object({
  contacts: Type.Array(InstagramCommitContactSchema, { minItems: 1 }),
});

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
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Import"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post("/parse", async (request: FastifyRequest, reply: FastifyReply) => {
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

          const { data: existingRows, error: existingError } = await client
            .from("people_social_media")
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
    { schema: { body: InstagramCommitBody } },
    async (
      request: FastifyRequest<{ Body: typeof InstagramCommitBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const rawContacts = request.body.contacts;

      // ── Pre-filter & deduplicate ────────────────────────────────────────────
      const seenHandles = new Set<string>();
      const validContacts: (typeof InstagramCommitBody.static)["contacts"][number][] = [];

      for (const contact of rawContacts) {
        if (!contact.isValid || !contact.instagramUsername) continue;

        const handle = contact.instagramUsername.trim().toLowerCase();
        if (!handle || seenHandles.has(handle)) continue;

        seenHandles.add(handle);
        validContacts.push(contact);
      }

      const skippedCount = rawContacts.length - validContacts.length;

      if (validContacts.length === 0) {
        return {
          importedCount: 0,
          updatedCount: 0,
          skippedCount,
        } satisfies InstagramImportCommitResponse;
      }

      const now = new Date().toISOString();

      // ── Step 1: Single bulk lookup for all existing person_ids by handle ────
      const handles = validContacts.map((c) => c.instagramUsername.trim().toLowerCase());

      // Chunk handles to stay within Postgres IN-list limits
      const handleToPersonId = new Map<string, string>();

      for (let i = 0; i < handles.length; i += HANDLE_LOOKUP_CHUNK_SIZE) {
        const chunk = handles.slice(i, i + HANDLE_LOOKUP_CHUNK_SIZE);

        const { data: existingRows, error: lookupError } = await client
          .from("people_social_media")
          .select("handle, person_id")
          .eq("user_id", user.id)
          .eq("platform", "instagram")
          .in("handle", chunk);

        if (lookupError) {
          return reply.status(500).send({ error: lookupError.message });
        }

        for (const row of existingRows ?? []) {
          if (row.handle && row.person_id) {
            handleToPersonId.set(row.handle.trim().toLowerCase(), row.person_id);
          }
        }
      }

      const toInsert = validContacts.filter(
        (c) => !handleToPersonId.has(c.instagramUsername.trim().toLowerCase()),
      );
      const toUpdate = validContacts.filter((c) =>
        handleToPersonId.has(c.instagramUsername.trim().toLowerCase()),
      );

      // ── Step 2a: Bulk insert new people ─────────────────────────────────────
      let importedCount = 0;
      const groupAssignments = new Map<DefaultImportGroupKey, Set<string>>();

      if (toInsert.length > 0) {
        const { data: insertedPeople, error: insertError } = await client
          .from("people")
          .insert(
            toInsert.map((c) => ({
              user_id: user.id,
              first_name: c.firstName,
              middle_name: c.middleName,
              last_name: c.lastName,
              myself: false,
              last_interaction: now,
            })),
          )
          .select("id");

        if (insertError || !insertedPeople) {
          return reply.status(500).send({ error: insertError?.message ?? "Insert failed" });
        }

        // Map back: inserted rows come back in the same order as the input array
        for (let i = 0; i < toInsert.length; i++) {
          const inserted = insertedPeople[i];
          if (inserted) {
            const handle = toInsert[i].instagramUsername.trim().toLowerCase();
            handleToPersonId.set(handle, inserted.id);

            // Collect group assignments for newly imported contacts
            const sources = (toInsert[i].sources ?? []) as InstagramImportSource[];
            const groupKeys = toInstagramImportGroupKeys(sources);
            for (const groupKey of groupKeys) {
              const members = groupAssignments.get(groupKey) ?? new Set<string>();
              members.add(inserted.id);
              groupAssignments.set(groupKey, members);
            }
          }
        }

        importedCount = insertedPeople.length;
      }

      // ── Step 2b: Concurrent update existing people ──────────────────────────
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
              })
              .eq("user_id", user.id)
              .eq("id", handleToPersonId.get(c.instagramUsername.trim().toLowerCase())!),
          ),
        );

        updatedCount = updateResults.filter((r) => !r.error).length;
      }

      // ── Step 3: Bulk upsert social media rows ──────────────────────────────
      const socialRows = validContacts
        .map((c) => {
          const handle = c.instagramUsername.trim().toLowerCase();
          const personId = handleToPersonId.get(handle);
          if (!personId) return null;
          return {
            user_id: user.id,
            person_id: personId,
            platform: "instagram" as const,
            handle,
            connected_at: c.connectedAt ?? null,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (socialRows.length > 0) {
        const { error: socialUpsertError } = await client
          .from("people_social_media")
          .upsert(socialRows, { onConflict: "user_id,person_id,platform" });

        if (socialUpsertError) {
          return reply.status(500).send({ error: socialUpsertError.message });
        }
      }

      // ── Step 4: Bulk group assignments (parallel per group key) ─────────────
      try {
        await Promise.all(
          Array.from(groupAssignments.entries()).map(([groupKey, personIds]) =>
            assignContactsToDefaultImportGroup(client, user.id, groupKey, Array.from(personIds)),
          ),
        );
      } catch (groupError) {
        const message =
          groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
        return reply.status(500).send({ error: message });
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
