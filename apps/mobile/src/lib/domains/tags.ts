import type { Tag, TagWithCount } from "@bondery/schemas";
import { generateUuid } from "../sync/ids";
import { submitSyncMutation } from "../sync/mutation-service";
import {
  getTag as getTagFromRepo,
  listTagsForContact,
  listTags as listTagsFromRepo,
} from "../sync/repositories/tags";

function newId(): string {
  return generateUuid();
}

export function listTags(): TagWithCount[] {
  return listTagsFromRepo();
}

export function getTag(tagId: string): Tag | null {
  return getTagFromRepo(tagId);
}

export function getContactTags(personId: string): Tag[] {
  return listTagsForContact(personId);
}

export function createTag(input: { label: string; color?: string; id?: string }): Tag {
  const id = input.id ?? newId();
  submitSyncMutation({
    payload: { color: input.color, id, label: input.label },
    type: "tag.create",
  });
  const tag = getTag(id);
  if (!tag) {
    throw new Error(`Tag not found after create: ${id}`);
  }
  return tag;
}

export function updateTag(tagId: string, input: Partial<{ label: string; color: string }>): Tag {
  submitSyncMutation({
    entityId: tagId,
    payload: input,
    type: "tag.update",
  });
  const tag = getTag(tagId);
  if (!tag) {
    throw new Error(`Tag not found after update: ${tagId}`);
  }
  return tag;
}

export function deleteTag(tagId: string): void {
  submitSyncMutation({
    entityId: tagId,
    payload: {},
    type: "tag.delete",
  });
}

/** @deprecated Use named exports (`createTag`, `listTags`, …). */
export const tagsDomain = {
  create: createTag,
  delete: deleteTag,
  get: getTag,
  list: listTags,
  listForContact: getContactTags,
  update: updateTag,
};
