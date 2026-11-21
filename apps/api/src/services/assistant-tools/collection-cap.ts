export const ASSISTANT_COLLECTION_CAP = 25;

/** Most tag ids an assistant contact search accepts in its tag filter. */
export const ASSISTANT_TAG_FILTER_MAX_IDS = 20;

/** Longest hex color string an assistant tool accepts. */
export const ASSISTANT_COLOR_MAX_LENGTH = 16;

/** Longest emoji string an assistant tool accepts. */
export const ASSISTANT_EMOJI_MAX_LENGTH = 16;

export function assistantPageSize(limit: number | undefined): number {
  return Math.min(limit ?? ASSISTANT_COLLECTION_CAP, ASSISTANT_COLLECTION_CAP);
}
