"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

export const RETURN_TO_STORAGE_KEY = "bondery:returnTo";

let isNavigatingToUnavailable = false;

/**
 * Navigates to the API unavailable page when the BFF or upstream API is down.
 * Idempotent — does not sign out or clear caches.
 */
export function handleApiUnavailable(): void {
  if (typeof window === "undefined" || isNavigatingToUnavailable) {
    return;
  }

  if (window.location.pathname.startsWith(WEBAPP_ROUTES.UNAVAILABLE)) {
    return;
  }

  isNavigatingToUnavailable = true;
  sessionStorage.setItem(RETURN_TO_STORAGE_KEY, window.location.pathname + window.location.search);
  window.location.assign(WEBAPP_ROUTES.UNAVAILABLE);
}
