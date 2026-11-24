/**
 * Hop-down stays on the current URL. Product data owns skeleton / stale / inline error.
 * Kept as a no-op so leftover call sites cannot resurrect global outage chrome.
 */
export function handleApiUnavailable(): void {
  // no-op: leftover call sites must not resurrect global outage chrome
}

/** No-op retained for stale unavailable bookmarks during rollout. */
export function resetApiUnavailableNavigation(): void {
  // no-op: leftover call sites must not resurrect global outage chrome
}
