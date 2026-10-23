/**
 * Pop if this navigator has history. Otherwise replace so GO_BACK is not
 * dispatched on a root screen (deep link, auth replace, or cold start).
 */
export function goBackOrReplace<THref>(
  router: {
    back: () => void;
    canGoBack: () => boolean;
    replace: (href: THref) => void;
  },
  href: THref,
): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(href);
}
