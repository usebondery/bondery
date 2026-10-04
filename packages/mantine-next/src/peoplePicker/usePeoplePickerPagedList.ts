"use client";

import { useDebouncedCallback } from "@mantine/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PEOPLE_PICKER_PAGE_SIZE } from "#peoplePicker/constants.js";
import {
  applyFirstPageFailure,
  applyLoadMoreFailure,
  applyLoadMoreStart,
  applyLocalReveal,
  applyPageResult,
  applyQueryChange,
  applyReset,
  createPeoplePickerPagedState,
  getBrowseFetchOffset,
  getFilteredPool,
  getLoadMoreKind,
  getVisiblePickerItemsForMode,
  isTypedQuery,
  type PeoplePickerItem,
  type PeoplePickerOnSearch,
  type PeoplePickerPagedState,
} from "#peoplePicker/peoplePickerPagedList.js";

type UsePeoplePickerPagedListOptions<T extends PeoplePickerItem> = {
  contactsHasMore?: boolean;
  filter?: (item: T) => boolean;
  matchQuery?: (item: T, query: string) => boolean;
  onSearch?: PeoplePickerOnSearch<T>;
  searchDebounceMs?: number;
  seed: T[];
};

export function usePeoplePickerPagedList<T extends PeoplePickerItem>({
  seed,
  contactsHasMore = false,
  onSearch,
  searchDebounceMs = 0,
  filter,
  matchQuery,
}: UsePeoplePickerPagedListOptions<T>) {
  const [state, setState] = useState<PeoplePickerPagedState<T>>(createPeoplePickerPagedState);
  const [scrollResetKey, setScrollResetKey] = useState(0);
  const [selectFirstOptionToken, setSelectFirstOptionToken] = useState(0);

  const stateRef = useRef(state);
  stateRef.current = state;
  const generationRef = useRef(0);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const contactsHasMoreRef = useRef(contactsHasMore);
  contactsHasMoreRef.current = contactsHasMore;
  const fetchLockRef = useRef(false);

  const bumpScroll = useCallback(() => {
    setScrollResetKey((current) => current + 1);
  }, []);

  const fetchPage = useCallback(
    async (offset: number, mode: "typed" | "browse", generation: number) => {
      const search = onSearchRef.current;
      if (!search) {
        return;
      }

      const query = mode === "typed" ? stateRef.current.query.trim() : "";
      try {
        const page = await search(query, { limit: PEOPLE_PICKER_PAGE_SIZE, offset });
        if (generation !== generationRef.current) {
          return;
        }
        setState((current) => {
          const next = applyPageResult(current, generation, offset, page, mode);
          return next ?? current;
        });
        if (mode === "typed" && offset === 0) {
          setSelectFirstOptionToken((current) => current + 1);
        }
      } catch {
        if (generation !== generationRef.current) {
          return;
        }
        setState((current) => {
          if (mode === "typed" && offset === 0) {
            return applyFirstPageFailure(current, generation) ?? current;
          }
          return applyLoadMoreFailure(current, generation) ?? current;
        });
      } finally {
        fetchLockRef.current = false;
      }
    },
    [],
  );

  const triggerTypedSearch = useDebouncedCallback((_query: string, generation: number) => {
    void fetchPage(0, "typed", generation);
  }, searchDebounceMs);

  const setQuery = useCallback(
    (query: string) => {
      const next = applyQueryChange(stateRef.current, query);
      generationRef.current = next.generation;
      setState(next);
      bumpScroll();
      if (!isTypedQuery(query)) {
        setSelectFirstOptionToken((current) => current + 1);
      }
      if (isTypedQuery(query) && onSearchRef.current) {
        triggerTypedSearch(query.trim(), next.generation);
      }
    },
    [bumpScroll, triggerTypedSearch],
  );

  const resetList = useCallback(() => {
    const next = applyReset(stateRef.current, contactsHasMoreRef.current);
    generationRef.current = next.generation;
    setState(next);
    bumpScroll();
    setSelectFirstOptionToken((current) => current + 1);
  }, [bumpScroll]);

  const loadMore = useCallback(() => {
    if (fetchLockRef.current) {
      return;
    }
    const current = stateRef.current;
    const hasOnSearch = Boolean(onSearchRef.current);
    const pool = getFilteredPool(seedRef.current, current, {
      filter,
      hasOnSearch,
      matchQuery,
    });
    const kind = getLoadMoreKind(pool, current, {
      contactsHasMore: contactsHasMoreRef.current,
      hasOnSearch,
    });

    if (kind === "reveal") {
      setState((prev) => applyLocalReveal(prev));
      return;
    }

    if (kind !== "fetch" || !onSearchRef.current) {
      return;
    }

    const typed = isTypedQuery(current.query);
    const offset = typed
      ? current.searchResults.length
      : getBrowseFetchOffset(seedRef.current.length, current.browseExtra.length);
    const generation = generationRef.current;
    fetchLockRef.current = true;
    setState((prev) => applyLoadMoreStart(prev));
    void fetchPage(offset, typed ? "typed" : "browse", generation);
  }, [fetchPage, filter, matchQuery]);

  const retryLoadMore = useCallback(() => {
    setState((current) => ({ ...current, loadMoreError: false }));
    loadMore();
  }, [loadMore]);

  const hasOnSearch = Boolean(onSearch);
  const pool = useMemo(
    () => getFilteredPool(seed, state, { filter, hasOnSearch, matchQuery }),
    [filter, hasOnSearch, matchQuery, seed, state],
  );
  const visibleItems = useMemo(
    () => getVisiblePickerItemsForMode(pool, state, hasOnSearch),
    [hasOnSearch, pool, state],
  );
  const loadMoreKind = getLoadMoreKind(pool, state, {
    contactsHasMore,
    hasOnSearch,
  });

  useEffect(() => {
    if (visibleItems.length > 0 || loadMoreKind !== "fetch" || fetchLockRef.current) {
      return;
    }
    loadMore();
  }, [loadMore, loadMoreKind, visibleItems.length]);

  const isTyped = isTypedQuery(state.query);
  const isFirstPageSearching = isTyped && hasOnSearch && state.isSearching;

  return {
    canLoadMore: loadMoreKind !== null || state.isLoadingMore,
    isFirstPageSearching,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    loadMoreError: state.loadMoreError,
    query: state.query,
    resetList,
    retryLoadMore,
    scrollResetKey,
    selectFirstOptionToken,
    setQuery,
    visibleItems,
  };
}
