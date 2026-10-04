import { PEOPLE_PICKER_PAGE_SIZE } from "#peoplePicker/constants.js";

export type PeoplePickerItem = { id: string };

export type PeoplePickerSearchPaging = {
  limit: number;
  offset: number;
};

export type PeoplePickerSearchPage<T> = {
  contacts: T[];
  hasMore: boolean;
};

export type PeoplePickerOnSearch<T extends PeoplePickerItem> = (
  query: string,
  paging: PeoplePickerSearchPaging,
) => Promise<PeoplePickerSearchPage<T>>;

export type PeoplePickerPagedState<T extends PeoplePickerItem> = {
  browseExtra: T[];
  browseHasMore: boolean;
  generation: number;
  isLoadingMore: boolean;
  isSearching: boolean;
  loadMoreError: boolean;
  query: string;
  searchHasMore: boolean;
  searchResults: T[];
  visibleCount: number;
};

export type LoadMoreKind = "reveal" | "fetch";

export function dedupeById<T extends PeoplePickerItem>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    seen.set(item.id, item);
  }
  return Array.from(seen.values());
}

export function isTypedQuery(query: string): boolean {
  return query.trim().length > 0;
}

export function createPeoplePickerPagedState<
  T extends PeoplePickerItem,
>(): PeoplePickerPagedState<T> {
  return {
    browseExtra: [],
    browseHasMore: false,
    generation: 0,
    isLoadingMore: false,
    isSearching: false,
    loadMoreError: false,
    query: "",
    searchHasMore: false,
    searchResults: [],
    visibleCount: PEOPLE_PICKER_PAGE_SIZE,
  };
}

export function getFilteredPool<T extends PeoplePickerItem>(
  seed: T[],
  state: PeoplePickerPagedState<T>,
  options: {
    filter?: (item: T) => boolean;
    hasOnSearch: boolean;
    matchQuery?: (item: T, query: string) => boolean;
  },
): T[] {
  const typed = isTypedQuery(state.query);
  let source: T[];
  if (typed && options.hasOnSearch) {
    source = state.searchResults;
  } else if (typed && options.matchQuery) {
    const query = state.query.trim();
    source = seed.filter((item) => options.matchQuery?.(item, query));
  } else {
    source = dedupeById([...seed, ...state.browseExtra]);
  }
  return options.filter ? source.filter(options.filter) : source;
}

/**
 * Typed server search shows every fetched row. Empty field (and local-only typed
 * filter) windows the pool in page-sized chunks.
 */
export function getVisiblePickerItemsForMode<T extends PeoplePickerItem>(
  pool: T[],
  state: PeoplePickerPagedState<T>,
  hasOnSearch: boolean,
): T[] {
  if (isTypedQuery(state.query) && hasOnSearch) {
    return pool;
  }
  return pool.slice(0, state.visibleCount);
}

export function getBrowseHasMore<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  contactsHasMore: boolean,
): boolean {
  return state.browseExtra.length > 0 ? state.browseHasMore : contactsHasMore;
}

export function getLoadMoreKind<T extends PeoplePickerItem>(
  pool: T[],
  state: PeoplePickerPagedState<T>,
  options: {
    contactsHasMore: boolean;
    hasOnSearch: boolean;
  },
): LoadMoreKind | null {
  if (state.isLoadingMore) {
    return null;
  }

  const typed = isTypedQuery(state.query);
  if (typed && options.hasOnSearch) {
    if (state.isSearching) {
      return null;
    }
    return state.searchHasMore ? "fetch" : null;
  }

  if (state.visibleCount < pool.length) {
    return "reveal";
  }

  if (!options.hasOnSearch) {
    return null;
  }

  if (typed) {
    return null;
  }

  return getBrowseHasMore(state, options.contactsHasMore) ? "fetch" : null;
}

export function getBrowseFetchOffset(seedLength: number, extraLength: number): number {
  return seedLength + extraLength;
}

export function applyReset<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  contactsHasMore: boolean,
): PeoplePickerPagedState<T> {
  return {
    ...state,
    browseExtra: [],
    browseHasMore: contactsHasMore,
    generation: state.generation + 1,
    isLoadingMore: false,
    isSearching: false,
    loadMoreError: false,
    query: "",
    searchHasMore: false,
    searchResults: [],
    visibleCount: PEOPLE_PICKER_PAGE_SIZE,
  };
}

export function applyQueryChange<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  query: string,
): PeoplePickerPagedState<T> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      ...state,
      generation: state.generation + 1,
      isLoadingMore: false,
      isSearching: false,
      loadMoreError: false,
      query,
      searchHasMore: false,
      searchResults: [],
      visibleCount: PEOPLE_PICKER_PAGE_SIZE,
    };
  }

  return {
    ...state,
    generation: state.generation + 1,
    isLoadingMore: false,
    isSearching: true,
    loadMoreError: false,
    query,
    searchHasMore: false,
    searchResults: [],
    visibleCount: PEOPLE_PICKER_PAGE_SIZE,
  };
}

export function applyLocalReveal<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  pageSize: number = PEOPLE_PICKER_PAGE_SIZE,
): PeoplePickerPagedState<T> {
  return {
    ...state,
    visibleCount: state.visibleCount + pageSize,
  };
}

export function applyPageResult<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  generation: number,
  offset: number,
  page: PeoplePickerSearchPage<T>,
  mode: "typed" | "browse",
): PeoplePickerPagedState<T> | null {
  if (generation !== state.generation) {
    return null;
  }

  if (mode === "typed") {
    const nextResults =
      offset === 0 ? page.contacts : dedupeById([...state.searchResults, ...page.contacts]);
    return {
      ...state,
      isLoadingMore: false,
      isSearching: false,
      loadMoreError: false,
      searchHasMore: page.hasMore,
      searchResults: nextResults,
    };
  }

  return {
    ...state,
    browseExtra: dedupeById([...state.browseExtra, ...page.contacts]),
    browseHasMore: page.hasMore,
    isLoadingMore: false,
    loadMoreError: false,
  };
}

export function applyLoadMoreStart<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
): PeoplePickerPagedState<T> {
  return {
    ...state,
    isLoadingMore: true,
    loadMoreError: false,
  };
}

export function applyLoadMoreFailure<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  generation: number,
): PeoplePickerPagedState<T> | null {
  if (generation !== state.generation) {
    return null;
  }
  return {
    ...state,
    isLoadingMore: false,
    isSearching: false,
    loadMoreError: true,
  };
}

export function applyFirstPageFailure<T extends PeoplePickerItem>(
  state: PeoplePickerPagedState<T>,
  generation: number,
): PeoplePickerPagedState<T> | null {
  if (generation !== state.generation) {
    return null;
  }
  return {
    ...state,
    isLoadingMore: false,
    isSearching: false,
    loadMoreError: false,
    searchHasMore: false,
    searchResults: [],
  };
}

/** ArrowDown on the last row should load more instead of wrapping to the first option. */
export function shouldLoadMoreOnArrowDown(params: {
  canLoadMore: boolean;
  optionCount: number;
  selectedIndex: number;
}): boolean {
  return (
    params.canLoadMore && params.optionCount > 0 && params.selectedIndex >= params.optionCount - 1
  );
}

export function handlePeoplePickerArrowDownLoadMore(
  event: { nativeEvent: { code: string } },
  params: {
    canLoadMore: boolean;
    loadMore: () => void;
    optionCount: number;
    selectedIndex: number;
  },
): void {
  if (event.nativeEvent.code !== "ArrowDown") {
    return;
  }
  if (
    shouldLoadMoreOnArrowDown({
      canLoadMore: params.canLoadMore,
      optionCount: params.optionCount,
      selectedIndex: params.selectedIndex,
    })
  ) {
    params.loadMore();
  }
}
