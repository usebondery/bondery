import type {
  InstagramImportCommitResponse,
  InstagramImportSource,
  InstagramPreparedContact,
} from "@bondery/schemas";
import { IMPORT_HANDLE_LOOKUP_CHUNK_SIZE } from "@bondery/schemas/constants";
import {
  assignContactsToDefaultImportGroup,
  type DefaultImportGroupKey,
  toInstagramImportGroupKeys,
} from "../../lib/import/default-groups.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { markBulkImportCompleted } from "../../services/import/followup.js";
import type { DomainContext } from "../_shared/context.js";

export async function commitInstagramImport(
  ctx: DomainContext,
  rawImportContacts: InstagramPreparedContact[],
): Promise<InstagramImportCommitResponse> {
  const { client, user, log } = ctx;
  const rawContacts = rawImportContacts;

  const seenHandles = new Set<string>();
  const validContacts: InstagramPreparedContact[] = [];

  for (const contact of rawContacts) {
    if (!contact.isValid || !contact.instagramUsername) {
      continue;
    }

    const handle = contact.instagramUsername.trim().toLowerCase();
    if (!handle || seenHandles.has(handle)) {
      continue;
    }

    seenHandles.add(handle);
    validContacts.push(contact);
  }

  const skippedCount = rawContacts.length - validContacts.length;

  if (validContacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
      updatedCount: 0,
    };
  }

  const now = new Date().toISOString();
  const handles = validContacts.map((c) => c.instagramUsername.trim().toLowerCase());
  const handleToPersonId = new Map<string, string>();

  for (let i = 0; i < handles.length; i += IMPORT_HANDLE_LOOKUP_CHUNK_SIZE) {
    const chunk = handles.slice(i, i + IMPORT_HANDLE_LOOKUP_CHUNK_SIZE);

    const { data: existingRows, error: lookupError } = await client
      .from("people_socials")
      .select("handle, person_id")
      .eq("user_id", user.id)
      .eq("platform", "instagram")
      .in("handle", chunk);

    if (lookupError) {
      throw internal("import_instagram_failed", lookupError.message);
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

  let importedCount = 0;
  const groupAssignments = new Map<DefaultImportGroupKey, Set<string>>();

  if (toInsert.length > 0) {
    const { data: insertedPeople, error: insertError } = await client
      .from("people")
      .insert(
        toInsert.map((c) => ({
          first_name: c.firstName,
          last_interaction: now,
          last_name: c.lastName,
          middle_name: c.middleName,
          myself: false,
          user_id: user.id,
        })),
      )
      .select("id");

    if (insertError || !insertedPeople) {
      throw internal("import_instagram_failed", insertError?.message ?? "Insert failed");
    }

    for (let i = 0; i < toInsert.length; i++) {
      const inserted = insertedPeople[i];
      if (inserted) {
        const handle = toInsert[i].instagramUsername.trim().toLowerCase();
        handleToPersonId.set(handle, inserted.id);

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

  let updatedCount = 0;

  if (toUpdate.length > 0) {
    const updateResults = await Promise.all(
      toUpdate.flatMap((c) => {
        const personId = handleToPersonId.get(c.instagramUsername.trim().toLowerCase());
        if (!personId) {
          return [];
        }

        return [
          client
            .from("people")
            .update({
              first_name: c.firstName,
              last_name: c.lastName,
              middle_name: c.middleName,
            })
            .eq("user_id", user.id)
            .eq("id", personId),
        ];
      }),
    );

    updatedCount = updateResults.filter((r) => !r.error).length;
  }

  const socialRows = validContacts
    .map((c) => {
      const handle = c.instagramUsername.trim().toLowerCase();
      const personId = handleToPersonId.get(handle);
      if (!personId) {
        return null;
      }
      return {
        connected_at: c.connectedAt ?? null,
        handle,
        person_id: personId,
        platform: "instagram" as const,
        user_id: user.id,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (socialRows.length > 0) {
    const { error: socialUpsertError } = await client
      .from("people_socials")
      .upsert(socialRows, { onConflict: "user_id,person_id,platform" });

    if (socialUpsertError) {
      throw internal("import_instagram_failed", socialUpsertError.message);
    }
  }

  try {
    await Promise.all(
      Array.from(groupAssignments.entries()).map(([groupKey, personIds]) =>
        assignContactsToDefaultImportGroup(client, user.id, groupKey, Array.from(personIds)),
      ),
    );
  } catch (groupError) {
    const message =
      groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
    throw internal("import_instagram_failed", message);
  }

  if (importedCount + updatedCount > 0) {
    try {
      await markBulkImportCompleted(ctx);
    } catch (followupError) {
      log?.error({ err: followupError }, "[instagram-import] Failed to mark import completed");
    }
  }

  return {
    importedCount,
    skippedCount,
    updatedCount,
  };
}
