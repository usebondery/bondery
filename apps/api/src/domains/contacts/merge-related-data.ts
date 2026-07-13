import type { MergeConflictChoice, MergeConflictField } from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  areValuesEquivalent,
  hasMeaningfulValue,
  MERGEABLE_SOCIAL_FIELDS,
  normalizeImportantDateSet,
  resolveConflictChoice,
} from "../../lib/contacts/merge-helpers.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

type ConflictResolutions = Partial<Record<MergeConflictField, MergeConflictChoice>>;

type ImportantDateRow = {
  type: string;
  date: string;
  note: string | null;
  notify_days_before: number | null;
};

function resolveMergedImportantDates(
  leftDates: ImportantDateRow[],
  rightDates: ImportantDateRow[],
  conflictResolutions: ConflictResolutions,
) {
  const importantDatesEqual =
    JSON.stringify(normalizeImportantDateSet(leftDates)) ===
    JSON.stringify(normalizeImportantDateSet(rightDates));

  if (!leftDates.length && rightDates.length) {
    return rightDates;
  }

  if (leftDates.length && rightDates.length && !importantDatesEqual) {
    const choice = resolveConflictChoice(conflictResolutions, "importantDates");
    return choice === "right" ? rightDates : leftDates;
  }

  return leftDates;
}

export async function mergeContactSocials(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const { data: socialRows, error: socialRowsError } = await client
    .from("people_socials")
    .select("id, person_id, platform, handle, connected_at")
    .eq("user_id", userId)
    .in("person_id", [leftPersonId, rightPersonId]);

  if (socialRowsError) {
    throw internal("contact_merge_failed", socialRowsError.message);
  }

  const leftSocialByPlatform = new Map(
    (socialRows || [])
      .filter((row) => row.person_id === leftPersonId)
      .map((row) => [row.platform, row]),
  );

  const rightSocialByPlatform = new Map(
    (socialRows || [])
      .filter((row) => row.person_id === rightPersonId)
      .map((row) => [row.platform, row]),
  );

  const socialInserts: Array<{
    user_id: string;
    person_id: string;
    platform: string;
    handle: string;
    connected_at: string | null;
  }> = [];
  const socialUpdatePromises: Array<PromiseLike<unknown>> = [];

  for (const [field, platform] of Object.entries(MERGEABLE_SOCIAL_FIELDS)) {
    const leftSocial = leftSocialByPlatform.get(platform);
    const rightSocial = rightSocialByPlatform.get(platform);

    if (!rightSocial || !hasMeaningfulValue(rightSocial.handle)) {
      continue;
    }

    if (!leftSocial) {
      socialInserts.push({
        connected_at: rightSocial.connected_at,
        handle: rightSocial.handle,
        person_id: leftPersonId,
        platform,
        user_id: userId,
      });
      continue;
    }

    if (areValuesEquivalent(leftSocial.handle, rightSocial.handle)) {
      continue;
    }

    const choice = resolveConflictChoice(conflictResolutions, field as MergeConflictField);
    if (choice !== "right") {
      continue;
    }

    socialUpdatePromises.push(
      client
        .from("people_socials")
        .update({
          connected_at: rightSocial.connected_at,
          handle: rightSocial.handle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", leftSocial.id)
        .eq("user_id", userId),
    );
  }

  const socialWriteResults = await Promise.allSettled([
    ...(socialInserts.length > 0 ? [client.from("people_socials").insert(socialInserts)] : []),
    ...socialUpdatePromises,
  ]);

  for (const result of socialWriteResults) {
    if (result.status === "rejected") {
      throw internal("contact_merge_socials_failed", result.reason);
    }
    if (
      result.status === "fulfilled" &&
      result.value &&
      typeof result.value === "object" &&
      "error" in result.value
    ) {
      const err = (result.value as { error: { code?: string; message: string } | null }).error;
      if (err && err.code !== "23505") {
        throw internal("contact_merge_failed", err.message);
      }
    }
  }
}

export async function mergeContactGroupMemberships(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
): Promise<void> {
  const { data: rightGroupMemberships, error: rightGroupMembershipsError } = await client
    .from("people_groups")
    .select("group_id")
    .eq("user_id", userId)
    .eq("person_id", rightPersonId);

  if (rightGroupMembershipsError) {
    throw internal("contact_merge_failed", rightGroupMembershipsError.message);
  }

  if ((rightGroupMemberships || []).length === 0) {
    return;
  }

  const { error: groupMergeError } = await client.from("people_groups").upsert(
    (rightGroupMemberships || []).map((membership) => ({
      group_id: membership.group_id,
      person_id: leftPersonId,
      user_id: userId,
    })),
    {
      ignoreDuplicates: true,
      onConflict: "person_id,group_id",
    },
  );

  if (groupMergeError) {
    throw internal("contact_merge_failed", groupMergeError.message);
  }
}

export async function mergeContactInteractionParticipants(
  client: SupabaseClient<Database>,
  leftPersonId: string,
  rightPersonId: string,
): Promise<void> {
  const { data: rightParticipants, error: rightParticipantsError } = await client
    .from("interaction_participants")
    .select("interaction_id")
    .eq("person_id", rightPersonId);

  if (rightParticipantsError) {
    throw internal("contact_merge_failed", rightParticipantsError.message);
  }

  if ((rightParticipants || []).length === 0) {
    return;
  }

  const { error: participantsMergeError } = await client.from("interaction_participants").upsert(
    (rightParticipants || []).map((participant) => ({
      interaction_id: participant.interaction_id,
      person_id: leftPersonId,
    })),
    {
      ignoreDuplicates: true,
      onConflict: "interaction_id,person_id",
    },
  );

  if (participantsMergeError) {
    throw internal("contact_merge_failed", participantsMergeError.message);
  }
}

export async function mergeContactImportantDates(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const [
    { data: leftImportantDates, error: leftImportantDatesError },
    { data: rightImportantDates, error: rightImportantDatesError },
  ] = await Promise.all([
    client
      .from("people_important_dates")
      .select("type, date, note, notify_days_before")
      .eq("user_id", userId)
      .eq("person_id", leftPersonId)
      .order("created_at", { ascending: true }),
    client
      .from("people_important_dates")
      .select("type, date, note, notify_days_before")
      .eq("user_id", userId)
      .eq("person_id", rightPersonId)
      .order("created_at", { ascending: true }),
  ]);

  if (leftImportantDatesError || rightImportantDatesError) {
    throw internal(
      "contact_merge_important_dates_load_failed",
      leftImportantDatesError ?? rightImportantDatesError,
    );
  }

  const normalizedLeftImportantDates = (leftImportantDates || []).map((event) => ({
    date: event.date,
    note: event.note,
    notify_days_before: event.notify_days_before,
    type: event.type,
  }));

  const normalizedRightImportantDates = (rightImportantDates || []).map((event) => ({
    date: event.date,
    note: event.note,
    notify_days_before: event.notify_days_before,
    type: event.type,
  }));

  const mergedImportantDates = resolveMergedImportantDates(
    normalizedLeftImportantDates,
    normalizedRightImportantDates,
    conflictResolutions,
  );

  const { error: deleteLeftImportantDatesError } = await client
    .from("people_important_dates")
    .delete()
    .eq("user_id", userId)
    .eq("person_id", leftPersonId);

  if (deleteLeftImportantDatesError) {
    throw internal("contact_merge_failed", deleteLeftImportantDatesError.message);
  }

  if (mergedImportantDates.length === 0) {
    return;
  }

  const { error: insertImportantDatesError } = await client.from("people_important_dates").insert(
    mergedImportantDates.map((event) => ({
      date: event.date,
      note: event.note,
      notify_days_before: event.notify_days_before,
      person_id: leftPersonId,
      type: event.type,
      user_id: userId,
    })),
  );

  if (insertImportantDatesError) {
    throw internal("contact_merge_failed", insertImportantDatesError.message);
  }
}

export async function mergeContactRelationships(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
): Promise<void> {
  const { data: relationshipsToTransfer, error: relationshipsToTransferError } = await client
    .from("people_relationships")
    .select("relationship_type, source_person_id, target_person_id")
    .eq("user_id", userId)
    .or(`source_person_id.eq.${rightPersonId},target_person_id.eq.${rightPersonId}`);

  if (relationshipsToTransferError) {
    throw internal("contact_merge_failed", relationshipsToTransferError.message);
  }

  const relationshipRows = (relationshipsToTransfer || [])
    .map((relationship) => {
      const nextSourcePersonId =
        relationship.source_person_id === rightPersonId
          ? leftPersonId
          : relationship.source_person_id;
      const nextTargetPersonId =
        relationship.target_person_id === rightPersonId
          ? leftPersonId
          : relationship.target_person_id;

      if (nextSourcePersonId === nextTargetPersonId) {
        return null;
      }

      return {
        relationship_type: relationship.relationship_type,
        source_person_id: nextSourcePersonId,
        target_person_id: nextTargetPersonId,
        user_id: userId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (relationshipRows.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    relationshipRows.map((row) => client.from("people_relationships").insert(row)),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.error) {
      const err = result.value.error;
      if (err.code !== "23505" && err.code !== "23514") {
        throw internal("contact_merge_failed", err.message);
      }
    }
  }
}

export async function mergeContactAvatar(
  client: SupabaseClient<Database>,
  userId: string,
  leftPersonId: string,
  rightPersonId: string,
  leftHasAvatar: boolean,
  rightHasAvatar: boolean,
  conflictResolutions: ConflictResolutions,
): Promise<void> {
  const rightAvatarPath = `${userId}/${rightPersonId}.jpg`;
  const leftAvatarPath = `${userId}/${leftPersonId}.jpg`;

  if (resolveConflictChoice(conflictResolutions, "avatar") === "right") {
    await client.storage.from("avatars").copy(rightAvatarPath, leftAvatarPath);
  }

  await client.storage.from("avatars").remove([rightAvatarPath]);

  const avatarChoice = resolveConflictChoice(conflictResolutions, "avatar");
  const survivorHasAvatar = avatarChoice === "right" ? rightHasAvatar : leftHasAvatar;

  await client
    .from("people")
    .update({ has_avatar: survivorHasAvatar })
    .eq("id", leftPersonId)
    .eq("user_id", userId);
}
