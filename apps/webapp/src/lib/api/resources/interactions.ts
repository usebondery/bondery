import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity, PaginationMeta } from "@bondery/schemas";
import { missingResourceError } from "@/lib/api/missingResourceError";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";
import { buildAvatarQueryString } from "@/lib/contacts/avatarParams";
import {
  localCalendarDayEnd,
  localCalendarDayStart,
} from "@/lib/interactions/interactionListRange";

export interface InteractionsListParams {
  contactId?: string;
  /** Calendar day `YYYY-MM-DD`. The path writes the local end of that day. */
  end_date?: string;
  limit?: number;
  offset?: number;
  search?: string;
  /** Calendar day `YYYY-MM-DD`. The path writes local midnight. */
  start_date?: string;
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
  if (params.search) {
    search.set("search", params.search);
  }
  if (params.start_date) {
    search.set("start_date", localCalendarDayStart(params.start_date).toISOString());
  }
  if (params.end_date) {
    search.set("end_date", localCalendarDayEnd(params.end_date).toISOString());
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
    throw missingResourceError("interaction_not_found");
  }
  return raw.interaction;
}
