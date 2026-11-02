import { isCalendarDate } from "@/lib/interactions/interactionListRange";

/** Calendar-day filters for the interactions timeline. Dates stay `YYYY-MM-DD` in the query key. */
export type InteractionsTimelineFilter = {
  end_date?: string;
  search?: string;
  start_date?: string;
};

export type InteractionsListFilter = InteractionsTimelineFilter & {
  /** True when both calendar days are set and `start_date` is after `end_date`. */
  invalidRange: boolean;
};

/**
 * Parse the interactions page URL.
 * A bad date is dropped. `start_date` after `end_date` is flagged and both days stay so the inputs can show them.
 */
export function parseInteractionsListParams(input: {
  end_date?: string | null;
  search?: string | null;
  start_date?: string | null;
}): InteractionsListFilter {
  const search = input.search?.trim() || undefined;
  const startDate = isCalendarDate(input.start_date) ? input.start_date : undefined;
  const endDate = isCalendarDate(input.end_date) ? input.end_date : undefined;
  const invalidRange = Boolean(startDate && endDate && startDate > endDate);
  return { end_date: endDate, invalidRange, search, start_date: startDate };
}

/** Filter the infinite query may send. An invalid range omits both dates. */
export function timelineFilterFromParsed(
  parsed: InteractionsListFilter,
): InteractionsTimelineFilter {
  const search = parsed.search ? { search: parsed.search } : {};
  if (parsed.invalidRange) {
    return search;
  }
  return {
    ...search,
    ...(parsed.end_date ? { end_date: parsed.end_date } : {}),
    ...(parsed.start_date ? { start_date: parsed.start_date } : {}),
  };
}

export function sameInteractionsTimelineFilter(
  left: InteractionsTimelineFilter,
  right: InteractionsTimelineFilter,
): boolean {
  return (
    left.search === right.search &&
    left.start_date === right.start_date &&
    left.end_date === right.end_date
  );
}

/**
 * Key and request params for one infinite query.
 * Omits empty search and absent dates so a search-only key matches prefetch.
 */
export function interactionsInfiniteParams(
  filter: InteractionsTimelineFilter,
  limit: number,
): InteractionsTimelineFilter & { limit: number } {
  return {
    limit,
    ...(filter.end_date ? { end_date: filter.end_date } : {}),
    ...(filter.search ? { search: filter.search } : {}),
    ...(filter.start_date ? { start_date: filter.start_date } : {}),
  };
}
