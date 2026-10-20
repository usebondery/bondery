"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { setOptimisticDocumentTitle } from "@/lib/metadata/navigationTitleStore";

/**
 * Client navigation that sets the tab title before the route transition starts.
 */
export function useNavigateWithTitle() {
  const router = useRouter();

  const navigateWithTitle = (href: Route, title: string) => {
    const trimmed = title.trim();
    if (trimmed) {
      setOptimisticDocumentTitle(trimmed);
    }
    router.push(href);
  };

  return { navigateWithTitle };
}
