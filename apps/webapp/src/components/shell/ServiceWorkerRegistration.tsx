"use client";

import { useEffect } from "react";

/**
 * Registers the Bondery service worker on mount.
 * Required for PWA installability (Chrome requires a registered SW).
 * Silently skips registration if the browser does not support service workers.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failures are non-fatal; the app works fine without it.
    });
  }, []);

  return null;
}
