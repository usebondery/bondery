/**
 * True only when the sentinel is in view, another page exists, and the next page is idle.
 * A failed next page stays false so the observer does not retry on its own.
 */
export function shouldRequestNextPage(
  hasMore: boolean,
  isFetchingNextPage: boolean,
  isFetchNextPageError: boolean,
  isIntersecting: boolean,
): boolean {
  return hasMore && !isFetchingNextPage && !isFetchNextPageError && isIntersecting;
}
