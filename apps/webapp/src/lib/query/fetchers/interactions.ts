import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Activity, PaginationMeta } from "@bondery/schemas";
import { buildAvatarQueryString } from "@/lib/avatarParams";
import { createClientFetcher } from "./createClientFetcher";
import { normalizePaginatedList } from "./pagination";

export interface InteractionsListParams {
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
  return `${API_ROUTES.INTERACTIONS}?${search.toString()}&${buildAvatarQueryString("medium")}`;
}

export function createInteractionsListQueryFn(params?: InteractionsListParams) {
  const fetch = createClientFetcher();
  const path = buildInteractionsListPath(params);
  return async (): Promise<InteractionsListResult> => {
    const raw = await fetch<{ interactions?: Activity[]; pagination?: PaginationMeta }>(path);
    const { items, pagination } = normalizePaginatedList<Activity, "interactions">(
      raw,
      "interactions",
      params?.limit ?? 50,
    );
    return { activities: items, pagination };
  };
}

export function createInteractionDetailQueryFn(id: string) {
  const fetch = createClientFetcher();
  return async (): Promise<Activity> => {
    const raw = await fetch<{ interaction?: Activity }>(`${API_ROUTES.INTERACTIONS}/${id}`);
    if (!raw.interaction) throw new Error("Interaction not found");
    return raw.interaction;
  };
}
