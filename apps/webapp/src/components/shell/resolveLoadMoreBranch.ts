export type LoadMoreBranch = "error" | "fallback" | "none" | "sentinel";

export type LoadMoreBranchInput = {
  hasMore: boolean;
  hasMounted: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  hasViewport: boolean;
};

/**
 * Picks the branch `ShellScrollLoadMore` renders.
 *
 * The shell viewport is client-only state, so the server render always has none.
 * `hasMounted` keeps the first client render on that same branch, because a
 * streamed boundary can hydrate after the viewport exists. Without it the client
 * renders the sentinel against server HTML that holds the fallback button, and
 * React reports a hydration mismatch.
 */
export function resolveLoadMoreBranch({
  hasMore,
  hasMounted,
  isFetchNextPageError,
  isFetchingNextPage,
  hasViewport,
}: LoadMoreBranchInput): LoadMoreBranch {
  if (isFetchNextPageError) {
    return "error";
  }
  if (!hasMore && !isFetchingNextPage) {
    return "none";
  }
  if (hasMounted && !hasViewport) {
    return "fallback";
  }
  return "sentinel";
}
