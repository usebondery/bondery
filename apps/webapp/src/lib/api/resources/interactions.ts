import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity, PaginationMeta } from "@bondery/schemas";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";
import { buildAvatarQueryString } from "@/lib/contacts/avatarParams";

export interface InteractionsListParams {
  contactId?: string;
  limit?: number;
  offset?: number;
}

export interface InteractionsListResult {
  activities: Activity[];
  pagination: PaginationMeta;
}

export function buildInteractionsListPath(params: InteractionsListParams = {}): string {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 50));
  search.set("offset", String(params.offset ?? 0));
  if (params.contactId) {
    search.set("contactId", params.contactId);
  }
  return `${API_ROUTES.INTERACTIONS}?${search.toString()}&${buildAvatarQueryString("medium")}`;
}

export function buildInteractionDetailPath(id: string): string {
  return `${API_ROUTES.INTERACTIONS}/${id}`;
}

export function parseInteractionsList(
  raw: Record<string, unknown>,
  fallbackLimit = 50,
): InteractionsListResult {
  const { items, pagination } = normalizePaginatedList<Activity, "interactions">(
    raw,
    "interactions",
    fallbackLimit,
  );
  return { activities: items, pagination };
}

export function parseInteractionDetail(raw: { interaction?: Activity }): Activity {
  if (!raw.interaction) {
    throw new Error("Interaction not found");
  }
  return raw.interaction;
}
