import type { Group, TablesInsert, TablesUpdate } from "@bondery/schemas";
import { GROUP_SELECT } from "../../lib/queries";
import { captureCurrentSyncTxid } from "../_shared/with-txid";
import { DomainError, type DomainContext } from "../_shared/context";
import {
  buildGroupDeleteChange,
  buildGroupRowChange,
  buildPeopleGroupsChanges,
} from "../../lib/sync/build-changes";
import { emitSyncBatch } from "../../lib/sync/emit-change";

export interface CreateGroupInput {
  id?: string;
  label: string;
  emoji: string;
  color: string;
}

export interface UpdateGroupInput {
  label?: string;
  emoji?: string;
  color?: string;
}

export async function createGroup(
  ctx: DomainContext,
  input: CreateGroupInput,
): Promise<{ data: { group: Group }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const insertData: TablesInsert<"groups"> = {
    user_id: user.id,
    label: input.label.trim(),
    emoji: input.emoji.trim() || null,
    color: input.color.trim() || null,
  };

  if (input.id) insertData.id = input.id;

  const { data: newGroup, error } = await client
    .from("groups")
    .insert(insertData)
    .select(GROUP_SELECT)
    .single();

  if (error) {
    throw new DomainError(error.message, 500);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(user.id, [buildGroupRowChange(newGroup as Record<string, unknown>)])) ?? 0;
  return { data: { group: newGroup as Group }, txid, serverSequence };
}

export async function updateGroup(
  ctx: DomainContext,
  groupId: string,
  input: UpdateGroupInput,
): Promise<{ data: { group: Group }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const updates: TablesUpdate<"groups"> = { updated_at: new Date().toISOString() };
  if (input.label !== undefined) updates.label = input.label.trim();
  if (input.emoji !== undefined) updates.emoji = input.emoji.trim();
  if (input.color !== undefined) updates.color = input.color.trim();

  const { data: group, error } = await client
    .from("groups")
    .update(updates)
    .eq("id", groupId)
    .eq("user_id", user.id)
    .select(GROUP_SELECT)
    .single();

  if (error) {
    throw new DomainError(error.message, 500);
  }

  if (!group) {
    throw new DomainError("Group not found", 404);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await emitSyncBatch(user.id, [buildGroupRowChange(group as Record<string, unknown>)])) ?? 0;
  return { data: { group: group as Group }, txid, serverSequence };
}

export async function deleteGroup(
  ctx: DomainContext,
  groupId: string,
): Promise<{ data: { deletedId: string }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data, error } = await client
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    throw new DomainError("Group not found", 404);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence = (await emitSyncBatch(user.id, [buildGroupDeleteChange(groupId)])) ?? 0;
  return { data: { deletedId: groupId }, txid, serverSequence };
}

export async function addGroupMembers(
  ctx: DomainContext,
  groupId: string,
  personIds: string[],
): Promise<{ data: { addedCount: number; skippedCount: number }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const { data: group, error: groupError } = await client
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (groupError) {
    throw new DomainError(groupError.message, 500);
  }

  if (!group) {
    throw new DomainError("Group not found", 404);
  }

  const { data: existingRows, error: lookupError } = await client
    .from("people_groups")
    .select("person_id")
    .eq("group_id", groupId)
    .in("person_id", personIds);

  if (lookupError) {
    throw new DomainError(lookupError.message, 500);
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.person_id));
  const newPersonIds = personIds.filter((id) => !existingIds.has(id));
  const skippedCount = existingIds.size;

  if (newPersonIds.length > 0) {
    const memberships = newPersonIds.map((personId) => ({
      person_id: personId,
      group_id: groupId,
      user_id: user.id,
    }));

    const { error } = await client.from("people_groups").upsert(memberships, {
      onConflict: "person_id,group_id",
      ignoreDuplicates: true,
    });

    if (error) {
      throw new DomainError(error.message, 500);
    }
  }

  const txid = await captureCurrentSyncTxid(client);
  const changes = await buildPeopleGroupsChanges(client, user.id, groupId, newPersonIds, "insert");
  const serverSequence = (await emitSyncBatch(user.id, changes)) ?? 0;
  return {
    data: { addedCount: newPersonIds.length, skippedCount },
    txid,
    serverSequence,
  };
}

export async function removeGroupMembers(
  ctx: DomainContext,
  groupId: string,
  personIds: string[],
): Promise<{ data: { removedCount: number }; txid: string; serverSequence: number }> {
  const { client, user } = ctx;

  const changes = await buildPeopleGroupsChanges(client, user.id, groupId, personIds, "delete");

  const { error } = await client
    .from("people_groups")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .in("person_id", personIds);

  if (error) {
    throw new DomainError(error.message, 500);
  }

  const txid = await captureCurrentSyncTxid(client);
  const serverSequence = (await emitSyncBatch(user.id, changes)) ?? 0;
  return { data: { removedCount: personIds.length }, txid, serverSequence };
}
