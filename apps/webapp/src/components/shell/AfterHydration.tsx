"use client";

import { useMounted } from "@mantine/hooks";
import type { ReactNode } from "react";

/**
 * Renders its children only after hydration, never on the server.
 *
 * Use it for headless shell components (analytics sync, registrars, notification managers)
 * that sit above the page. When one of them subscribes to a TanStack query during the server
 * render, it creates that query empty above the page. The page `HydrationBoundary` then defers
 * existing queries to an effect, which never runs on the server, so the page renders its
 * loading state on the server and real content in the browser: a hydration mismatch. The
 * settings page hit this through the settings and subscription queries.
 */
export function AfterHydration({ children }: { children: ReactNode }) {
  return useMounted() ? children : null;
}
