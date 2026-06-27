import type { Tag, TagWithCount } from "@bondery/schemas";
import { create } from "zustand";

interface TagsStoreState {
  byId: Record<string, TagWithCount>;
  upsertTag: (tag: Tag | TagWithCount) => void;
  upsertTags: (tags: Array<Tag | TagWithCount>) => void;
  removeTag: (id: string) => void;
  clearAll: () => void;
}

function toTagWithCount(tag: Tag | TagWithCount, existing?: TagWithCount): TagWithCount {
  return {
    ...tag,
    contactCount: "contactCount" in tag ? tag.contactCount : existing?.contactCount ?? 0,
  };
}

export const useTagsStore = create<TagsStoreState>()((set) => ({
  byId: {},
  upsertTag: (tag) =>
    set((state) => ({
      byId: {
        ...state.byId,
        [tag.id]: toTagWithCount(tag, state.byId[tag.id]),
      },
    })),
  upsertTags: (tags) =>
    set((state) => {
      if (tags.length === 0) {
        return state;
      }

      const nextById = { ...state.byId };
      for (const tag of tags) {
        nextById[tag.id] = toTagWithCount(tag, nextById[tag.id]);
      }

      return { byId: nextById };
    }),
  removeTag: (id) =>
    set((state) => ({
      byId: Object.fromEntries(
        Object.entries(state.byId).filter(([tagId]) => tagId !== id),
      ),
    })),
  clearAll: () => set({ byId: {} }),
}));
