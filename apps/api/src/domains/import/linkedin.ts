import type { LinkedInImportCommitResponse } from "@bondery/schemas";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { markBulkImportCompleted } from "../../services/import/followup.js";
import type { DomainContext } from "../_shared/context.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";

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

export async function commitLinkedInImport(
  ctx: DomainContext,
  rawImportContacts: Array<{
    isValid: boolean;
    linkedinUsername: string;
    firstName: string;
    middleName?: string | null;
    lastName?: string | null;
    position?: string | null;
    company?: string | null;
    email?: string | null;
    connectedAt?: string | null;
  }>,
): Promise<LinkedInImportCommitResponse> {
  const { client, user, log } = ctx;
  const rawContacts = rawImportContacts;

  // De-duplicate by handle, drop invalid rows up-front.
  const seenHandles = new Set<string>();
  const validContacts = rawContacts.filter((contact) => {
    if (!contact.isValid || !contact.linkedinUsername) {
      return false;
    }
    const handle = contact.linkedinUsername.trim();
    if (!handle || seenHandles.has(handle)) {
      return false;
    }
    seenHandles.add(handle);
    return true;
  });

  const skippedCount = rawContacts.length - validContacts.length;

  if (validContacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
      updatedCount: 0,
    } satisfies LinkedInImportCommitResponse;
  }

  const now = new Date().toISOString();

  // ── Step 1: Single query to find all existing person_ids by handle ──────
  const handles = validContacts.map((c) => c.linkedinUsername.trim());

  const { data: existingSocialRows, error: socialLookupError } = await client
    .from("people_socials")
    .select("handle, person_id")
    .eq("user_id", user.id)
    .eq("platform", "linkedin")
    .in("handle", handles);

  if (socialLookupError) {
    throw internal("import_linkedin_failed", socialLookupError.message);
  }

  const handleToPersonId = new Map<string, string>();
  for (const row of existingSocialRows ?? []) {
    if (row.handle && row.person_id) {
      // Decode percent-encoded handles (e.g. from old imports) so they
      // match the decoded form produced by the current parser.
      let decodedHandle: string;
      try {
        decodedHandle = decodeURIComponent(row.handle.trim());
      } catch {
        decodedHandle = row.handle.trim();
      }
      handleToPersonId.set(decodedHandle, row.person_id);
    }
  }

  const toInsert = validContacts.filter((c) => !handleToPersonId.has(c.linkedinUsername.trim()));
  const toUpdate = validContacts.filter((c) => handleToPersonId.has(c.linkedinUsername.trim()));

  // ── Step 2a: Bulk insert new people ──────────────────────────────────────
  let importedCount = 0;
  let importedPersonIds: string[] = [];

  if (toInsert.length > 0) {
    const { data: insertedPeople, error: insertError } = await client
      .from("people")
      .insert(
        toInsert.map((c) => ({
          first_name: c.firstName,
          headline: buildImportedTitle(c.position ?? null, c.company ?? null),
          last_interaction: now,
          last_name: c.lastName,
          middle_name: c.middleName,
          myself: false,
          user_id: user.id,
        })),
      )
      .select("id, first_name, last_name");

    if (insertError || !insertedPeople) {
      throw internal("import_linkedin_failed", insertError?.message ?? "Insert failed");
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
      toUpdate.flatMap((c) => {
        const personId = handleToPersonId.get(c.linkedinUsername.trim());
        if (!personId) {
          return [];
        }

        return [
          client
            .from("people")
            .update({
              first_name: c.firstName,
              headline: buildImportedTitle(c.position ?? null, c.company ?? null),
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

  // ── Step 3: Bulk upsert social media rows ─────────────────────────────────
  const socialRows = validContacts
    .map((c) => {
      const personId = handleToPersonId.get(c.linkedinUsername.trim());
      if (!personId) {
        return null;
      }
      return {
        connected_at: c.connectedAt ?? null,
        handle: c.linkedinUsername.trim(),
        person_id: personId,
        platform: "linkedin" as const,
        user_id: user.id,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (socialRows.length > 0) {
    const { error: socialUpsertError } = await client
      .from("people_socials")
      .upsert(socialRows, { onConflict: "user_id,person_id,platform" });

    if (socialUpsertError) {
      throw internal("import_linkedin_failed", socialUpsertError.message);
    }
  }

  // ── Step 4: Bulk insert emails (only validContacts that have one) ─────────────
  const validContactsWithEmail = validContacts.filter((c) => c.email);

  if (validContactsWithEmail.length > 0) {
    const personIds = validContactsWithEmail
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
      if (!row.person_id) {
        continue;
      }
      const list = existingEmailsByPerson.get(row.person_id) ?? [];
      list.push(row.value.trim().toLowerCase());
      existingEmailsByPerson.set(row.person_id, list);
    }

    const emailRowsToInsert = validContactsWithEmail
      .map((c) => {
        const personId = handleToPersonId.get(c.linkedinUsername.trim());
        if (!personId || !c.email) {
          return null;
        }
        const existing = existingEmailsByPerson.get(personId) ?? [];
        if (existing.includes(c.email.trim().toLowerCase())) {
          return null;
        }
        return {
          person_id: personId,
          preferred: existing.length === 0,
          sort_order: existing.length,
          type: "work" as const,
          user_id: user.id,
          value: c.email,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (emailRowsToInsert.length > 0) {
      // Ignore conflicts — duplicate emails are silently skipped.
      await client.from("people_emails").insert(emailRowsToInsert);
    }
  }

  try {
    await assignContactsToDefaultImportGroup(client, user.id, "linkedin_import", importedPersonIds);
  } catch (groupError) {
    const message =
      groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
    throw internal("import_linkedin_failed", message);
  }

  if (importedCount + updatedCount > 0) {
    try {
      await markBulkImportCompleted(ctx);
    } catch (followupError) {
      log?.error({ err: followupError }, "[linkedin-import] Failed to mark import completed");
    }
    scheduleMergeRecommendationsRefresh(ctx);
  }

  const response: LinkedInImportCommitResponse = {
    importedCount,
    skippedCount,
    updatedCount,
  };

  return response;
}
