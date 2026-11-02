import { WEBAPP_ROUTES } from "./paths.js";

export { TAG_IDS_QUERY_PARAM } from "@bondery/schemas/http";

/** One `tag_ids` value. Ids are separated by commas. */
export function serializeTagIdsQueryParam(tagIds: readonly string[]): string | undefined {
  const ids = tagIds.map((id) => id.trim()).filter((id) => id.length > 0);
  return ids.length > 0 ? ids.join(",") : undefined;
}

/** Reads `tag_ids=id1,id2` and a repeated `tag_ids` key. */
export function parseTagIdsQueryParam(
  value: string | readonly string[] | null | undefined,
): string[] {
  if (value == null) {
    return [];
  }

  const entries = typeof value === "string" ? [value] : value;
  return entries
    .flatMap((entry) => entry.split(","))
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/** Pending UI action after a product page loads. Not a login return path. */
export const NEXT_ACTION_PARAM = "next_action" as const;

/** Snake_case intended-action values. Key is the constant; value is the query. */
export const NEXT_ACTIONS = {
  ADD_INTERACTION: "add_interaction",
} as const;

export type NextAction = (typeof NEXT_ACTIONS)[keyof typeof NEXT_ACTIONS];

export function routePersonWithNextAction(personId: string, action: NextAction): string {
  return `${WEBAPP_ROUTES.PERSON}/${personId}?${NEXT_ACTION_PARAM}=${encodeURIComponent(action)}`;
}
