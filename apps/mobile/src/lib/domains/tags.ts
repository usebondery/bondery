import type { Tag } from "@bondery/schemas";
import { submitSyncMutation } from "../sync/mutation-service";
import { generateUuid } from "../sync/uuid";
import { getTag, listTags, listTagsForContact } from "../sync/repositories/tags";

function newId(): string {
  return generateUuid();
}

export const tagsDomain = {
  list: listTags,
  get: getTag,
  listForContact: listTagsForContact,

  create(input: { label: string; color?: string; id?: string }): Tag {
    const id = input.id ?? newId();
    submitSyncMutation({
      type: "tag.create",
      payload: { id, label: input.label, color: input.color },
    });
    return getTag(id)!;
  },

  update(tagId: string, input: Partial<{ label: string; color: string }>): Tag {
    submitSyncMutation({
      type: "tag.update",
      entityId: tagId,
      payload: input,
    });
    return getTag(tagId)!;
  },

  delete(tagId: string): void {
    submitSyncMutation({
      type: "tag.delete",
      entityId: tagId,
      payload: {},
    });
  },
};
