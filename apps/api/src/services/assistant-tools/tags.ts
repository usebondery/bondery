import { GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import {
  addTagMembers,
  createTag,
  deleteTag,
  removeTagMembers,
  updateTag,
} from "../../domains/tags/index.js";
import { getTag, listTagMembers, listTags } from "../tags/queries.js";
import { ASSISTANT_COLLECTION_CAP, assistantPageSize } from "./collection-cap.js";

export const searchTagsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.string().min(1).max(200).describe("Label contains (case-insensitive)"),
});

export const getTagsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getTagInputSchema = z.object({
  tagId: z.string().uuid(),
});

export const createTagInputSchema = z.object({
  label: z.string().min(1).max(GROUP_LABEL_MAX_LENGTH),
});

export const updateTagInputSchema = z.object({
  color: z.string().min(1).max(16).optional(),
  label: z.string().min(1).max(GROUP_LABEL_MAX_LENGTH).optional(),
  tagId: z.string().uuid(),
});

export const deleteTagInputSchema = z.object({
  tagId: z.string().uuid(),
});

export const getTagContactsInputSchema = z.object({
  limit: z.number().int().min(1).max(ASSISTANT_COLLECTION_CAP).optional(),
  offset: z.number().int().min(0).optional(),
  search: z.string().min(1).max(200).optional(),
  tagId: z.string().uuid(),
});

export const tagMembershipInputSchema = z.object({
  personIds: z.array(z.string().uuid()).min(1).max(ASSISTANT_COLLECTION_CAP),
  tagId: z.string().uuid(),
});

export async function executeSearchTags(
  ctx: DomainContext,
  args: z.infer<typeof searchTagsInputSchema>,
) {
  const take = assistantPageSize(args.limit);
  const skip = args.offset ?? 0;
  const needle = args.search.trim().toLowerCase();
  const { tags } = await listTags(ctx);
  const matches = tags.filter((tag) => tag.label.toLowerCase().includes(needle));
  return {
    tags: matches.slice(skip, skip + take),
    totalCount: matches.length,
  };
}

export async function executeGetTags(ctx: DomainContext, args: z.infer<typeof getTagsInputSchema>) {
  const take = assistantPageSize(args.limit);
  const skip = args.offset ?? 0;
  const { tags, totalCount } = await listTags(ctx);
  return {
    tags: tags.slice(skip, skip + take),
    totalCount,
  };
}

export async function executeGetTag(ctx: DomainContext, args: z.infer<typeof getTagInputSchema>) {
  return getTag(ctx, args.tagId);
}

export async function executeCreateTag(
  ctx: DomainContext,
  args: z.infer<typeof createTagInputSchema>,
) {
  const created = await createTag(ctx, { label: args.label });
  return { tag: created.data.tag };
}

export async function executeUpdateTag(
  ctx: DomainContext,
  args: z.infer<typeof updateTagInputSchema>,
) {
  const updated = await updateTag(ctx, args.tagId, {
    ...(args.color !== undefined ? { color: args.color } : {}),
    ...(args.label !== undefined ? { label: args.label } : {}),
  });
  return { tag: updated.data.tag };
}

export async function executeDeleteTag(
  ctx: DomainContext,
  args: z.infer<typeof deleteTagInputSchema>,
) {
  await deleteTag(ctx, args.tagId);
  return { message: "Tag deleted successfully" };
}

export async function executeGetTagContacts(
  ctx: DomainContext,
  args: z.infer<typeof getTagContactsInputSchema>,
) {
  return listTagMembers(ctx, args.tagId, {
    limit: assistantPageSize(args.limit),
    offset: args.offset ?? 0,
    ...(args.search !== undefined ? { search: args.search } : {}),
  });
}

export async function executeCreateTagMembership(
  ctx: DomainContext,
  args: z.infer<typeof tagMembershipInputSchema>,
) {
  const uniquePersonIds = [...new Set(args.personIds)];
  const result = await addTagMembers(ctx, args.tagId, uniquePersonIds);
  return { addedCount: result.data.addedCount };
}

export async function executeDeleteTagMembership(
  ctx: DomainContext,
  args: z.infer<typeof tagMembershipInputSchema>,
) {
  const uniquePersonIds = [...new Set(args.personIds)];
  const result = await removeTagMembers(ctx, args.tagId, uniquePersonIds);
  return { removedCount: result.data.removedCount };
}
