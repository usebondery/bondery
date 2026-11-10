import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLoadMoreBranch } from "./resolveLoadMoreBranch.js";

const base = {
  hasMore: true,
  hasMounted: true,
  hasViewport: true,
  isFetchingNextPage: false,
  isFetchNextPageError: false,
};

describe("resolveLoadMoreBranch", () => {
  it("renders the sentinel once mounted with a viewport", () => {
    assert.equal(resolveLoadMoreBranch(base), "sentinel");
  });

  it("renders the sentinel before mount even with a viewport, matching the server", () => {
    // A streamed boundary can hydrate after the viewport exists. The server saw no
    // viewport, so this branch must not depend on it yet.
    assert.equal(resolveLoadMoreBranch({ ...base, hasMounted: false }), "sentinel");
  });

  it("renders the sentinel before mount without a viewport, matching the server", () => {
    assert.equal(
      resolveLoadMoreBranch({ ...base, hasMounted: false, hasViewport: false }),
      "sentinel",
    );
  });

  it("shows the fallback button when mounted without a shell viewport", () => {
    assert.equal(resolveLoadMoreBranch({ ...base, hasViewport: false }), "fallback");
  });

  it("shows the error line before any other branch", () => {
    assert.equal(resolveLoadMoreBranch({ ...base, isFetchNextPageError: true }), "error");
    assert.equal(
      resolveLoadMoreBranch({
        ...base,
        hasMore: false,
        hasViewport: false,
        isFetchNextPageError: true,
      }),
      "error",
    );
  });

  it("hides the sentinel when there is no next page", () => {
    assert.equal(resolveLoadMoreBranch({ ...base, hasMore: false }), "none");
    assert.equal(resolveLoadMoreBranch({ ...base, hasMore: false, hasViewport: false }), "none");
  });

  it("keeps the sentinel while the next page is in flight", () => {
    assert.equal(resolveLoadMoreBranch({ ...base, isFetchingNextPage: true }), "sentinel");
  });
});
