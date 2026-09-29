import { GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import {
  addGroupMembers,
  createGroup,
  deleteGroup,
  removeGroupMembers,
  updateGroup,
} from "../../domains/groups/index.js";
import { getGroup, listGroupMembers, listGroups } from "../groups/queries.js";
import { ASSISTANT_COLLECTION_CAP, assistantPageSize } from "./collection-cap.js";

export const searchGroupsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.string().min(1).max(200).describe("Label contains (case-insensitive)"),
});

export const getGroupsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getGroupInputSchema = z.object({
  groupId: z.string().uuid(),
});

export const createGroupInputSchema = z.object({
  color: z.string().min(1).max(16).describe("Hex color, e.g. #3b82f6"),
  emoji: z.string().min(1).max(16),
  label: z.string().min(1).max(GROUP_LABEL_MAX_LENGTH),
});

export const updateGroupInputSchema = z.object({
  color: z.string().min(1).max(16).optional(),
  emoji: z.string().min(1).max(16).optional(),
  groupId: z.string().uuid(),
  label: z.string().min(1).max(GROUP_LABEL_MAX_LENGTH).optional(),
});

export const deleteGroupInputSchema = z.object({
  groupId: z.string().uuid(),
});

export const getGroupContactsInputSchema = z.object({
  groupId: z.string().uuid(),
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.string().min(1).max(200).optional(),
});

export const groupMembershipInputSchema = z.object({
  groupId: z.string().uuid(),
  personIds: z.array(z.string().uuid()).min(1).max(ASSISTANT_COLLECTION_CAP),
});

export async function executeSearchGroups(
  ctx: DomainContext,
  args: z.infer<typeof searchGroupsInputSchema>,
) {
  const take = assistantPageSize(args.limit);
  const skip = args.offset ?? 0;
  const needle = args.search.trim().toLowerCase();
  const { groups } = await listGroups(ctx);
  const matches = groups.filter((group) => group.label.toLowerCase().includes(needle));
  return {
    groups: matches.slice(skip, skip + take),
    totalCount: matches.length,
  };
}

export async function executeGetGroups(
  ctx: DomainContext,
  args: z.infer<typeof getGroupsInputSchema>,
) {
  const take = assistantPageSize(args.limit);
  const skip = args.offset ?? 0;
  const { groups, totalCount } = await listGroups(ctx);
  return {
    groups: groups.slice(skip, skip + take),
    totalCount,
  };
}

export async function executeGetGroup(
  ctx: DomainContext,
  args: z.infer<typeof getGroupInputSchema>,
) {
  return getGroup(ctx, args.groupId);
}

export async function executeCreateGroup(
  ctx: DomainContext,
  args: z.infer<typeof createGroupInputSchema>,
) {
  const created = await createGroup(ctx, {
    color: args.color,
    emoji: args.emoji,
    label: args.label,
  });
  return { group: created.data.group };
}

export async function executeUpdateGroup(
  ctx: DomainContext,
  args: z.infer<typeof updateGroupInputSchema>,
) {
  const updated = await updateGroup(ctx, args.groupId, {
    ...(args.color !== undefined ? { color: args.color } : {}),
    ...(args.emoji !== undefined ? { emoji: args.emoji } : {}),
    ...(args.label !== undefined ? { label: args.label } : {}),
  });
  return { group: updated.data.group };
}

export async function executeDeleteGroup(
  ctx: DomainContext,
  args: z.infer<typeof deleteGroupInputSchema>,
) {
  await deleteGroup(ctx, args.groupId);
  return { message: "Group deleted successfully" };
}

export async function executeGetGroupContacts(
  ctx: DomainContext,
  args: z.infer<typeof getGroupContactsInputSchema>,
) {
  return listGroupMembers(ctx, args.groupId, {
    limit: assistantPageSize(args.limit),
    offset: args.offset ?? 0,
    ...(args.search !== undefined ? { search: args.search } : {}),
  });
}

export async function executeCreateGroupMembership(
  ctx: DomainContext,
  args: z.infer<typeof groupMembershipInputSchema>,
) {
  const uniquePersonIds = [...new Set(args.personIds)];
  const result = await addGroupMembers(ctx, args.groupId, uniquePersonIds);
  return {
    addedCount: result.data.addedCount,
    message: "Contacts added to group successfully",
    skippedCount: result.data.skippedCount,
  };
}

export async function executeDeleteGroupMembership(
  ctx: DomainContext,
  args: z.infer<typeof groupMembershipInputSchema>,
) {
  const uniquePersonIds = [...new Set(args.personIds)];
  const result = await removeGroupMembers(ctx, args.groupId, uniquePersonIds);
  return {
    message: "Contacts removed from group successfully",
    removedCount: result.data.removedCount,
  };
}
