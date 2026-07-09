import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Keeps PostgREST `.in()` filters within URL-size limits. */
const IN_FILTER_CHUNK_SIZE = 500;

/** PostgREST returns at most 1000 rows per request unless paginated. */
const SELECT_PAGE_SIZE = 1000;

type ParticipantMembership = {
  interaction_id: string;
  person_id: string;
};

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function fetchAllRows<T>(
  fetchPage: (
    offset: number,
    pageSize: number,
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await fetchPage(offset, SELECT_PAGE_SIZE);
    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      break;
    }

    rows.push(...data);
    if (data.length < SELECT_PAGE_SIZE) {
      break;
    }

    offset += SELECT_PAGE_SIZE;
  }

  return rows;
}

async function fetchParticipantMembershipsByPersonIds(
  client: SupabaseClient<Database>,
  personIds: string[],
): Promise<ParticipantMembership[]> {
  const rows: ParticipantMembership[] = [];

  for (const chunk of chunkArray(personIds, IN_FILTER_CHUNK_SIZE)) {
    const chunkRows = await fetchAllRows<ParticipantMembership>(async (offset, pageSize) =>
      client
        .from("interaction_participants")
        .select("interaction_id, person_id")
        .in("person_id", chunk)
        .range(offset, offset + pageSize - 1),
    );
    rows.push(...chunkRows);
  }

  return rows;
}

async function fetchParticipantMembershipsByInteractionIds(
  client: SupabaseClient<Database>,
  interactionIds: string[],
): Promise<ParticipantMembership[]> {
  const rows: ParticipantMembership[] = [];

  for (const chunk of chunkArray(interactionIds, IN_FILTER_CHUNK_SIZE)) {
    const chunkRows = await fetchAllRows<ParticipantMembership>(async (offset, pageSize) =>
      client
        .from("interaction_participants")
        .select("interaction_id, person_id")
        .in("interaction_id", chunk)
        .range(offset, offset + pageSize - 1),
    );
    rows.push(...chunkRows);
  }

  return rows;
}

async function fetchOwnedInteractionIds(
  client: SupabaseClient<Database>,
  userId: string,
  interactionIds: string[],
): Promise<string[]> {
  const ownedIds: string[] = [];

  for (const chunk of chunkArray(interactionIds, IN_FILTER_CHUNK_SIZE)) {
    const chunkRows = await fetchAllRows<{ id: string }>(async (offset, pageSize) =>
      client
        .from("interactions")
        .select("id")
        .eq("user_id", userId)
        .in("id", chunk)
        .range(offset, offset + pageSize - 1),
    );
    ownedIds.push(...chunkRows.map((row) => row.id));
  }

  return ownedIds;
}

async function fetchParticipantlessInteractionIds(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string[]> {
  const interactionIds = (
    await fetchAllRows<{ id: string }>(async (offset, pageSize) =>
      client
        .from("interactions")
        .select("id")
        .eq("user_id", userId)
        .range(offset, offset + pageSize - 1),
    )
  ).map((row) => row.id);

  if (interactionIds.length === 0) {
    return [];
  }

  const memberships = await fetchParticipantMembershipsByInteractionIds(client, interactionIds);
  const interactionIdsWithParticipants = new Set(
    memberships.map((membership) => membership.interaction_id),
  );

  return interactionIds.filter((id) => !interactionIdsWithParticipants.has(id));
}

async function deleteInteractionsByIds(
  client: SupabaseClient<Database>,
  interactionIds: string[],
): Promise<void> {
  for (const chunk of chunkArray(interactionIds, IN_FILTER_CHUNK_SIZE)) {
    const { error } = await client.from("interactions").delete().in("id", chunk);
    if (error) {
      throw new Error(error.message);
    }
  }
}

function buildParticipantsByInteractionId(
  memberships: ParticipantMembership[],
): Map<string, Set<string>> {
  const participantsByInteractionId = new Map<string, Set<string>>();

  for (const membership of memberships) {
    const participants =
      participantsByInteractionId.get(membership.interaction_id) ?? new Set<string>();
    participants.add(membership.person_id);
    participantsByInteractionId.set(membership.interaction_id, participants);
  }

  return participantsByInteractionId;
}

export type DeleteOrphanedInteractionsOptions = {
  /**
   * When true, also deletes interactions that already have zero participants.
   * Enabled for bulk contact deletes where orphaned timeline rows are likely.
   */
  includeParticipantlessInteractions?: boolean;
};

/**
 * Deletes interactions that would have no remaining participants after removing
 * the given contacts. Interactions that only involve the user's "myself" card
 * are kept because that contact is never included in `contactIds`.
 */
export async function deleteOrphanedInteractionsForDeletedContacts(
  client: SupabaseClient<Database>,
  userId: string,
  contactIds: string[],
  options?: DeleteOrphanedInteractionsOptions,
): Promise<void> {
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return;
  }

  const deletedContactIds = new Set(contactIds.filter(Boolean));
  if (deletedContactIds.size === 0) {
    return;
  }

  const impactedMemberships = await fetchParticipantMembershipsByPersonIds(
    client,
    Array.from(deletedContactIds),
  );

  const candidateInteractionIds = new Set(
    impactedMemberships.map((membership) => membership.interaction_id),
  );

  if (options?.includeParticipantlessInteractions) {
    const participantlessInteractionIds = await fetchParticipantlessInteractionIds(client, userId);
    for (const interactionId of participantlessInteractionIds) {
      candidateInteractionIds.add(interactionId);
    }
  }

  if (candidateInteractionIds.size === 0) {
    return;
  }

  const ownedInteractionIds = await fetchOwnedInteractionIds(
    client,
    userId,
    Array.from(candidateInteractionIds),
  );

  if (ownedInteractionIds.length === 0) {
    return;
  }

  const allMemberships = await fetchParticipantMembershipsByInteractionIds(
    client,
    ownedInteractionIds,
  );
  const participantsByInteractionId = buildParticipantsByInteractionId(allMemberships);

  const interactionIdsToDelete: string[] = [];

  for (const interactionId of ownedInteractionIds) {
    const participants = participantsByInteractionId.get(interactionId);

    if (!participants || participants.size === 0) {
      interactionIdsToDelete.push(interactionId);
      continue;
    }

    const allParticipantsDeleted = Array.from(participants).every((personId) =>
      deletedContactIds.has(personId),
    );

    if (allParticipantsDeleted) {
      interactionIdsToDelete.push(interactionId);
    }
  }

  if (interactionIdsToDelete.length === 0) {
    return;
  }

  await deleteInteractionsByIds(client, interactionIdsToDelete);
}
