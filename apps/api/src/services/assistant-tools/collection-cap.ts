export const ASSISTANT_COLLECTION_CAP = 25;

export function assistantPageSize(limit: number | undefined): number {
  return Math.min(limit ?? ASSISTANT_COLLECTION_CAP, ASSISTANT_COLLECTION_CAP);
}
