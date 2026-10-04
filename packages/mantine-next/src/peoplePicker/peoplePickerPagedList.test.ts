import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PEOPLE_PICKER_PAGE_SIZE } from "./constants.js";
import {
  applyFirstPageFailure,
  applyLoadMoreFailure,
  applyLocalReveal,
  applyPageResult,
  applyQueryChange,
  applyReset,
  createPeoplePickerPagedState,
  getBrowseFetchOffset,
  getFilteredPool,
  getLoadMoreKind,
  getVisiblePickerItemsForMode,
  handlePeoplePickerArrowDownLoadMore,
  type PeoplePickerPagedState,
  shouldLoadMoreOnArrowDown,
} from "./peoplePickerPagedList.js";

type Item = { id: string };

function item(id: string): Item {
  return { id };
}

function items(count: number, prefix = "p"): Item[] {
  return Array.from({ length: count }, (_, index) => item(`${prefix}-${index + 1}`));
}

function emptyState(): PeoplePickerPagedState<Item> {
  return createPeoplePickerPagedState<Item>();
}

describe("peoplePickerPagedList", () => {
  it("empty field starts with a window of 10 then reveals the next 10 locally", () => {
    const seed = items(25);
    let state = emptyState();
    const pool = getFilteredPool(seed, state, { hasOnSearch: true });
    assert.equal(pool.length, 25);
    assert.deepEqual(
      getVisiblePickerItemsForMode(pool, state, true).map((entry) => entry.id),
      items(10).map((entry) => entry.id),
    );
    assert.equal(
      getLoadMoreKind(pool, state, { contactsHasMore: true, hasOnSearch: true }),
      "reveal",
    );

    state = applyLocalReveal(state);
    const afterReveal = getVisiblePickerItemsForMode(pool, state, true);
    assert.equal(afterReveal.length, 20);
    assert.equal(afterReveal[10]?.id, "p-11");
    assert.equal(
      getLoadMoreKind(pool, state, { contactsHasMore: true, hasOnSearch: true }),
      "reveal",
    );

    state = applyLocalReveal(state);
    assert.equal(getVisiblePickerItemsForMode(pool, state, true).length, 25);
    assert.equal(
      getLoadMoreKind(pool, state, { contactsHasMore: true, hasOnSearch: true }),
      "fetch",
    );
    assert.equal(getBrowseFetchOffset(seed.length, state.browseExtra.length), 25);
  });

  it("typed offset 0 replaces the list and later offsets append without dropping prior rows", () => {
    let state = applyQueryChange(emptyState(), "ada");
    assert.equal(state.isSearching, true);
    assert.equal(state.generation, 1);

    const first = applyPageResult(
      state,
      state.generation,
      0,
      { contacts: items(10, "a"), hasMore: true },
      "typed",
    );
    assert.ok(first);
    state = first;
    assert.equal(state.isSearching, false);
    assert.deepEqual(
      state.searchResults.map((entry) => entry.id),
      items(10, "a").map((entry) => entry.id),
    );

    const appended = applyPageResult(
      state,
      state.generation,
      PEOPLE_PICKER_PAGE_SIZE,
      { contacts: [item("a-10"), item("a-11"), item("a-12")], hasMore: false },
      "typed",
    );
    assert.ok(appended);
    state = appended;
    assert.equal(state.searchResults.length, 12);
    assert.equal(state.searchResults[9]?.id, "a-10");
    assert.equal(state.searchResults[10]?.id, "a-11");
    assert.equal(state.searchHasMore, false);
    assert.equal(
      getLoadMoreKind(state.searchResults, state, { contactsHasMore: false, hasOnSearch: true }),
      null,
    );
  });

  it("ignores stale generation results after a newer query", () => {
    const firstQuery = applyQueryChange(emptyState(), "al");
    const secondQuery = applyQueryChange(firstQuery, "ada");
    assert.equal(secondQuery.generation, firstQuery.generation + 1);

    const stale = applyPageResult(
      secondQuery,
      firstQuery.generation,
      0,
      { contacts: [item("stale")], hasMore: false },
      "typed",
    );
    assert.equal(stale, null);

    const fresh = applyPageResult(
      secondQuery,
      secondQuery.generation,
      0,
      { contacts: [item("ada-1")], hasMore: false },
      "typed",
    );
    assert.ok(fresh);
    assert.deepEqual(
      fresh.searchResults.map((entry) => entry.id),
      ["ada-1"],
    );

    assert.equal(applyLoadMoreFailure(secondQuery, firstQuery.generation), null);
    assert.equal(applyFirstPageFailure(secondQuery, firstQuery.generation), null);
  });

  it("stops load-more when hasMore is false", () => {
    const seed = items(10);
    let state = emptyState();
    const pool = getFilteredPool(seed, state, { hasOnSearch: true });
    assert.equal(getLoadMoreKind(pool, state, { contactsHasMore: false, hasOnSearch: true }), null);

    state = applyQueryChange(state, "bo");
    const page = applyPageResult(
      state,
      state.generation,
      0,
      { contacts: items(4, "b"), hasMore: false },
      "typed",
    );
    assert.ok(page);
    assert.equal(
      getLoadMoreKind(page.searchResults, page, { contactsHasMore: true, hasOnSearch: true }),
      null,
    );
  });

  it("reset restores the empty 10-window and bumps generation", () => {
    let state = applyQueryChange(emptyState(), "ada");
    const page = applyPageResult(
      state,
      state.generation,
      0,
      { contacts: items(10, "a"), hasMore: true },
      "typed",
    );
    assert.ok(page);
    state = page;
    const generation = state.generation;
    state = applyReset(state, true);
    assert.equal(state.query, "");
    assert.equal(state.searchResults.length, 0);
    assert.equal(state.visibleCount, PEOPLE_PICKER_PAGE_SIZE);
    assert.equal(state.generation, generation + 1);
  });

  it("local-only typed search still reveals the next window while isSearching is true", () => {
    const seed = items(25);
    const state = applyQueryChange(emptyState(), "p-1");
    assert.equal(state.isSearching, true);
    const pool = getFilteredPool(seed, state, {
      hasOnSearch: false,
      matchQuery: (entry, query) => entry.id.includes(query),
    });
    assert.equal(getVisiblePickerItemsForMode(pool, state, false).length, 10);
    assert.equal(
      getLoadMoreKind(pool, state, { contactsHasMore: false, hasOnSearch: false }),
      "reveal",
    );
  });

  it("ArrowDown on the last option loads more instead of wrapping while hasMore", () => {
    assert.equal(
      shouldLoadMoreOnArrowDown({ canLoadMore: true, optionCount: 10, selectedIndex: 9 }),
      true,
    );
    assert.equal(
      shouldLoadMoreOnArrowDown({ canLoadMore: true, optionCount: 10, selectedIndex: 8 }),
      false,
    );
    assert.equal(
      shouldLoadMoreOnArrowDown({ canLoadMore: false, optionCount: 10, selectedIndex: 9 }),
      false,
    );
    assert.equal(
      shouldLoadMoreOnArrowDown({ canLoadMore: true, optionCount: 10, selectedIndex: -1 }),
      false,
    );
  });

  it("ArrowDown on the last option calls loadMore while hasMore", () => {
    let loadMoreCalls = 0;
    handlePeoplePickerArrowDownLoadMore(
      { nativeEvent: { code: "ArrowDown" } },
      {
        canLoadMore: true,
        loadMore: () => {
          loadMoreCalls += 1;
        },
        optionCount: 10,
        selectedIndex: 9,
      },
    );
    assert.equal(loadMoreCalls, 1);

    handlePeoplePickerArrowDownLoadMore(
      { nativeEvent: { code: "ArrowUp" } },
      {
        canLoadMore: true,
        loadMore: () => {
          loadMoreCalls += 1;
        },
        optionCount: 10,
        selectedIndex: 9,
      },
    );
    assert.equal(loadMoreCalls, 1);
  });
});
